import { Prisma } from "@prisma/client";
import { BusinessRuleError } from "@/server/errors";

/**
 * Tính tiền thuê — hàm thuần, không đụng database.
 * Công thức hard-code theo spec: cứ đủ 3 ngày thì tính 1 combo 3 ngày,
 * số ngày lẻ còn lại tính theo giá 1 ngày (5 ngày = 1 combo + 2 ngày lẻ).
 */

const COMBO_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type Money = Prisma.Decimal | number;

export type RentalPrice = {
  combo3Count: number;
  singleDayCount: number;
  rentalFee: Prisma.Decimal;
};

/** Số ngày thuê, làm tròn LÊN theo từng khoảng 24 giờ (25 giờ = 2 ngày). */
export function calculateRentalDays(pickupAt: Date, returnDueAt: Date): number {
  const durationMs = returnDueAt.getTime() - pickupAt.getTime();
  if (durationMs <= 0) {
    throw new BusinessRuleError("Thời điểm trả phải sau thời điểm nhận máy.");
  }
  return Math.ceil(durationMs / MS_PER_DAY);
}

export function calculateRentalPrice(
  days: number,
  price1day: Money,
  priceCombo3: Money
): RentalPrice {
  if (!Number.isInteger(days) || days <= 0) {
    throw new BusinessRuleError("Thời gian thuê phải ít nhất một ngày.");
  }

  const combo3Count = Math.floor(days / COMBO_DAYS);
  const singleDayCount = days % COMBO_DAYS;
  const rentalFee = new Prisma.Decimal(priceCombo3)
    .mul(combo3Count)
    .add(new Prisma.Decimal(price1day).mul(singleDayCount));

  return { combo3Count, singleDayCount, rentalFee };
}

/** Tổng tiền thuê của tất cả các máy trong đơn. */
export function sumRentalFees(
  items: { rentalFee: Prisma.Decimal }[]
): Prisma.Decimal {
  return items.reduce(
    (total, item) => total.add(item.rentalFee),
    new Prisma.Decimal(0)
  );
}
