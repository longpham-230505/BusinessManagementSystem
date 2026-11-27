import {
  PaymentDirection,
  PaymentMethod,
  PaymentType,
  Prisma,
} from "@prisma/client";
import { calculateOrderTotals, sumLineTotals } from "@/server/services/order-totals";
import type { Db } from "@/server/services/types";

/**
 * Thanh toán của đơn bán phim / in ảnh.
 *
 * - Đơn chuyển sang "Đã thanh toán" → ghi nhận khoản thu còn thiếu so với số khách cần trả.
 * - Đơn chuyển sang trạng thái sau đó (đang giao / hoàn tất) mà chưa có khoản thu nào → ghi nhận
 *   thu đủ (khách nhận tại chỗ, COD...).
 * - Hủy đơn đã thu tiền → ghi nhận khoản hoàn bằng số tiền đã thu ròng.
 */

export const PAYMENT_METHODS = [
  PaymentMethod.CASH,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.OTHER,
] as const;

const ORDER_PAYMENT_TYPES = [PaymentType.ORDER_PAYMENT, PaymentType.ORDER_REFUND];

/** Số tiền khách cần trả của đơn bán phim / in ảnh (xem `order-totals.ts`). */
export async function loadSalesAmountDue(db: Db, orderId: string): Promise<Prisma.Decimal> {
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      discountAmount: true,
      surchargeAmount: true,
      shippingFee: true,
      filmSaleItems: { select: { quantity: true, salePrice: true } },
      photoPrintItems: { select: { quantity: true, unitPrice: true } },
    },
  });

  const subtotal = sumLineTotals([
    ...order.filmSaleItems.map((item) => ({ quantity: item.quantity, unitPrice: item.salePrice })),
    ...order.photoPrintItems.map((item) => ({ quantity: item.quantity, unitPrice: item.unitPrice })),
  ]);
  return calculateOrderTotals({ subtotal, ...order }).amountDue;
}

/** Tiền đã thu ròng của đơn = Σ khoản thu − Σ khoản hoàn (bỏ qua khoản đã xóa mềm). */
export async function loadNetPaid(db: Db, orderId: string): Promise<Prisma.Decimal> {
  const payments = await db.payment.findMany({
    where: { orderId, deletedAt: null, paymentType: { in: ORDER_PAYMENT_TYPES } },
    select: { paymentType: true, amount: true },
  });
  return payments.reduce(
    (total, payment) =>
      payment.paymentType === PaymentType.ORDER_PAYMENT
        ? total.add(payment.amount)
        : total.sub(payment.amount),
    new Prisma.Decimal(0)
  );
}

async function createPayment(
  db: Db,
  input: {
    orderId: string;
    type: PaymentType;
    direction: PaymentDirection;
    amount: Prisma.Decimal;
    method: PaymentMethod;
    at: Date;
    notes: string;
  }
) {
  if (!input.amount.gt(0)) return;
  await db.payment.create({
    data: {
      orderId: input.orderId,
      paymentType: input.type,
      direction: input.direction,
      amount: input.amount,
      paymentMethod: input.method,
      paymentDate: input.at,
      notes: input.notes,
    },
  });
}

/** Ghi nhận khoản thu khi đơn được chuyển sang một trạng thái "đã thu tiền". */
export async function recordPaymentForStatus(
  db: Db,
  input: { orderId: string; becamePaid: boolean; method: PaymentMethod; at: Date }
) {
  const { orderId, becamePaid, method, at } = input;
  const [due, paid] = await Promise.all([loadSalesAmountDue(db, orderId), loadNetPaid(db, orderId)]);

  // "Đã thanh toán": thu nốt phần còn thiếu. Trạng thái sau: chỉ thu khi chưa có khoản nào.
  const shouldCollect = becamePaid ? due.gt(paid) : paid.isZero();
  if (!shouldCollect) return;

  await createPayment(db, {
    orderId,
    type: PaymentType.ORDER_PAYMENT,
    direction: PaymentDirection.IN,
    amount: due.sub(paid),
    method,
    at,
    notes: "Thu tiền đơn hàng",
  });
}

/** Hoàn lại toàn bộ số tiền đã thu ròng khi hủy đơn. */
export async function refundOrderPayments(db: Db, input: { orderId: string; at: Date }) {
  const { orderId, at } = input;
  const paid = await loadNetPaid(db, orderId);

  await createPayment(db, {
    orderId,
    type: PaymentType.ORDER_REFUND,
    direction: PaymentDirection.OUT,
    amount: paid,
    method: PaymentMethod.CASH,
    at,
    notes: "Hoàn tiền do hủy đơn",
  });
}
