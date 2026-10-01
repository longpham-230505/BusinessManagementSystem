import { Prisma } from "@prisma/client";
import { BusinessRuleError } from "@/server/errors";

/**
 * Công thức tiền của đơn (spec mục 11.1) — suy ra, không lưu trong database:
 *
 *   subtotal      = Σ giá các dòng
 *   order_revenue = subtotal - discount + surcharge        (không gồm phí ship)
 *   amount_due    = order_revenue + shipping_fee           (số khách cần trả)
 */

type Money = Prisma.Decimal;

export type OrderTotals = {
  subtotal: Money;
  orderRevenue: Money;
  amountDue: Money;
};

/** Thành tiền một dòng: số lượng × đơn giá. */
export function lineTotal(quantity: number, unitPrice: Money): Money {
  return unitPrice.mul(quantity);
}

export function sumLineTotals(lines: { quantity: number; unitPrice: Money }[]): Money {
  return lines.reduce(
    (total, line) => total.add(lineTotal(line.quantity, line.unitPrice)),
    new Prisma.Decimal(0)
  );
}

export function calculateOrderTotals(input: {
  subtotal: Money;
  discountAmount: Money;
  surchargeAmount: Money;
  shippingFee: Money;
}): OrderTotals {
  const { subtotal, discountAmount, surchargeAmount, shippingFee } = input;
  const orderRevenue = subtotal.sub(discountAmount).add(surchargeAmount);
  return { subtotal, orderRevenue, amountDue: orderRevenue.add(shippingFee) };
}

/** Ràng buộc của spec: giảm giá không được vượt tổng tiền hàng. */
export function assertDiscountWithinSubtotal(discountAmount: Money, subtotal: Money) {
  if (discountAmount.gt(subtotal)) {
    throw new BusinessRuleError("Giảm giá không được vượt quá tổng tiền hàng.");
  }
}
