/**
 * Số ngày thuê gợi ý theo khoảng thời gian — hàm thuần, dùng được cả ở client lẫn server.
 * Làm tròn LÊN theo từng khoảng 24 giờ (25 giờ = 2 ngày).
 */

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Số ngày thuê tối đa cho phép nhập tay (chặn gõ nhầm). */
export const MAX_RENTAL_DAYS = 365;

/**
 * Số ngày trả trễ so với hạn trả, làm tròn LÊN theo 24 giờ (trễ 1 giờ = 1 ngày); 0 nếu không trễ.
 * `returnedAt` là thời điểm đã trả máy, hoặc "bây giờ" nếu máy vẫn đang thuê.
 */
export function calculateOverdueDays(returnDueAt: Date, returnedAt: Date): number {
  const lateMs = returnedAt.getTime() - returnDueAt.getTime();
  return lateMs > 0 ? Math.ceil(lateMs / MS_PER_DAY) : 0;
}

/** Trả về null nếu thời điểm trả không sau thời điểm nhận. */
export function suggestRentalDays(pickupAt: Date, returnDueAt: Date): number | null {
  const durationMs = returnDueAt.getTime() - pickupAt.getTime();
  if (!Number.isFinite(durationMs) || durationMs <= 0) return null;
  return Math.ceil(durationMs / MS_PER_DAY);
}
