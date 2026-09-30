import {
  DepositKind,
  PaymentDirection,
  PaymentType,
  Prisma,
} from "@prisma/client";
import { BusinessRuleError } from "@/server/errors";
import type { Db } from "@/server/services/types";

/** Các loại cọc bảo đảm chọn được khi giao máy (cọc giữ chỗ được xử lý riêng). */
export const SECURITY_DEPOSIT_KINDS = [
  DepositKind.SECURITY_CASH,
  DepositKind.SECURITY_ITEM,
  DepositKind.SECURITY_NONE,
] as const;

export type SecurityDepositKind = (typeof SECURITY_DEPOSIT_KINDS)[number];

type PaymentRecord = {
  orderId: string;
  depositId: string;
  paymentType: PaymentType;
  direction: PaymentDirection;
  amount: Prisma.Decimal;
  paymentDate: Date;
  notes?: string | null;
};

/** Ghi một dòng Payment cho khoản cọc; bỏ qua nếu số tiền bằng 0. */
async function recordDepositPayment(db: Db, payment: PaymentRecord) {
  if (payment.amount.isZero()) return;
  await db.payment.create({ data: payment });
}

/** Ghi nhận tiền cọc giữ chỗ khách đã chuyển. */
export async function recordBookingDeposit(
  db: Db,
  input: { orderId: string; amount: Prisma.Decimal; receivedAt: Date }
) {
  const { orderId, amount, receivedAt } = input;

  const deposit = await db.deposit.create({
    data: {
      orderId,
      kind: DepositKind.BOOKING,
      amountReceived: amount,
      receivedAt,
    },
  });

  await recordDepositPayment(db, {
    orderId,
    depositId: deposit.id,
    paymentType: PaymentType.BOOKING_DEPOSIT_RECEIVED,
    direction: PaymentDirection.IN,
    amount,
    paymentDate: receivedAt,
  });
}

/**
 * Ghi nhận cọc bảo đảm lúc giao máy:
 * - SECURITY_CASH: phải có số tiền > 0, phát sinh một Payment thu tiền.
 * - SECURITY_ITEM: phải mô tả tài sản, số tiền = 0.
 * - SECURITY_NONE: không có tiền và không có tài sản.
 */
export async function recordSecurityDeposit(
  db: Db,
  input: {
    orderId: string;
    kind: SecurityDepositKind;
    cashAmount: Prisma.Decimal;
    itemDescription: string | null;
    receivedAt: Date;
  }
) {
  const { orderId, kind, cashAmount, itemDescription, receivedAt } = input;
  validateSecurityDeposit(kind, cashAmount, itemDescription);

  const deposit = await db.deposit.create({
    data: {
      orderId,
      kind,
      amountReceived: cashAmount,
      itemDescription:
        kind === DepositKind.SECURITY_ITEM ? itemDescription : null,
      receivedAt,
    },
  });

  await recordDepositPayment(db, {
    orderId,
    depositId: deposit.id,
    paymentType: PaymentType.SECURITY_DEPOSIT_RECEIVED,
    direction: PaymentDirection.IN,
    amount: cashAmount,
    paymentDate: receivedAt,
  });
}

function validateSecurityDeposit(
  kind: SecurityDepositKind,
  cashAmount: Prisma.Decimal,
  itemDescription: string | null
) {
  if (kind === DepositKind.SECURITY_CASH && !cashAmount.gt(0)) {
    throw new BusinessRuleError("Cọc tiền mặt phải có số tiền lớn hơn 0.");
  }
  if (kind !== DepositKind.SECURITY_CASH && !cashAmount.isZero()) {
    throw new BusinessRuleError(
      "Cọc tài sản hoặc không cọc phải có số tiền bằng 0."
    );
  }
  if (kind === DepositKind.SECURITY_ITEM && !itemDescription) {
    throw new BusinessRuleError("Hãy mô tả tài sản được giữ làm cọc.");
  }
}

/**
 * Xử lý một khoản cọc sau khi trả máy: hoàn lại một phần/toàn bộ và/hoặc giữ lại.
 * Khoản hoàn phát sinh một Payment chi tiền; khoản giữ lại không tạo Payment
 * (tiền đã nằm trong tay doanh nghiệp).
 */
export async function settleDeposit(
  db: Db,
  input: {
    orderId: string;
    depositId: string;
    refunded: Prisma.Decimal;
    forfeited: Prisma.Decimal;
    note: string | null;
    settledAt: Date;
  }
) {
  const { orderId, depositId, refunded, forfeited, note, settledAt } = input;

  const deposit = await db.deposit.findFirst({
    where: { id: depositId, orderId },
  });
  if (!deposit)
    throw new BusinessRuleError("Không tìm thấy khoản cọc của đơn.");
  if (deposit.resolvedAt) {
    throw new BusinessRuleError("Khoản cọc này đã được xử lý trước đó.");
  }
  if (refunded.add(forfeited).gt(deposit.amountReceived)) {
    throw new BusinessRuleError(
      "Tổng hoàn và giữ cọc không được vượt số tiền đã nhận."
    );
  }

  await db.deposit.update({
    where: { id: depositId },
    data: {
      amountRefunded: refunded,
      amountForfeited: forfeited,
      resolutionNote: note,
      resolvedAt: settledAt,
    },
  });

  await recordDepositPayment(db, {
    orderId,
    depositId,
    paymentType:
      deposit.kind === DepositKind.BOOKING
        ? PaymentType.BOOKING_DEPOSIT_REFUNDED
        : PaymentType.SECURITY_DEPOSIT_REFUNDED,
    direction: PaymentDirection.OUT,
    amount: refunded,
    paymentDate: settledAt,
    notes: note,
  });
}
