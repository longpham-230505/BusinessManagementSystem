import { Prisma } from "@prisma/client";
import { MAX_RENTAL_DAYS, suggestRentalDays } from "@/lib/rental-days";
import { BusinessRuleError } from "@/server/errors";

/**
 * Tính tiền thuê — hàm thuần, không đụng database.
 * Công thức hard-code theo spec: cứ đủ 3 ngày thì tính 1 combo 3 ngày,
 * số ngày lẻ còn lại tính theo giá 1 ngày (5 ngày = 1 combo + 2 ngày lẻ).
 */

const COMBO_DAYS = 3;

type Money = Prisma.Decimal | number;

export type RentalPrice = {
  combo3Count: number;
  singleDayCount: number;
  rentalFee: Prisma.Decimal;
};

/** Số ngày thuê gợi ý, làm tròn LÊN theo từng khoảng 24 giờ (25 giờ = 2 ngày). */
export function calculateRentalDays(pickupAt: Date, returnDueAt: Date): number {
  const days = suggestRentalDays(pickupAt, returnDueAt);
  if (days === null) {
    throw new BusinessRuleError("Thời điểm trả phải sau thời điểm nhận máy.");
  }
  return days;
}

/**
 * Số ngày thuê chốt cho đơn: người dùng có thể nhập tay (gợi ý chỉ là giá trị mặc định);
 * để trống thì dùng số ngày gợi ý theo thời gian. Vẫn bắt buộc thời điểm trả sau thời điểm nhận.
 */
export function resolveRentalDays(
  pickupAt: Date,
  returnDueAt: Date,
  requestedDays: number | null | undefined
): number {
  const suggested = calculateRentalDays(pickupAt, returnDueAt);
  if (requestedDays === null || requestedDays === undefined) return suggested;
  if (!Number.isInteger(requestedDays) || requestedDays <= 0) {
    throw new BusinessRuleError("Số ngày thuê phải là số nguyên lớn hơn 0.");
  }
  if (requestedDays > MAX_RENTAL_DAYS) {
    throw new BusinessRuleError(`Số ngày thuê tối đa là ${MAX_RENTAL_DAYS}.`);
  }
  return requestedDays;
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
