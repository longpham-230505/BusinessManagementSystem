/**
 * Bố trí các lượt thuê lên bảng lịch tuần — hàm thuần, không đụng database.
 *
 * Mỗi lượt thuê là một thanh trải từ ngày nhận máy đến ngày kết thúc (ngày trả thật nếu
 * đã trả, ngược lại là hạn trả), cắt theo 7 ngày của tuần đang xem. Hai lượt thuê của
 * cùng một máy chạm nhau trong một ngày (trả sáng, giao chiều) được xếp ở hai làn khác nhau.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const DAYS_IN_WEEK = 7;

export type TimelineBooking = {
  cameraId: string;
  start: Date;
  end: Date;
};

export type TimelineBar<T extends TimelineBooking> = {
  booking: T;
  /** Cột bắt đầu, 1–7 (Thứ 2 = 1). */
  startCol: number;
  /** Số ngày thanh trải qua trong tuần này. */
  span: number;
  /** Làn (hàng con) trong dòng của máy, bắt đầu từ 0. */
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

/**
 * @param weekStart 00:00 giờ Việt Nam của thứ Hai đầu tuần
 * @returns các thanh theo từng máy (`cameraId`), đã cắt theo tuần và gán làn
 */
export function layoutTimelineBars<T extends TimelineBooking>(
  bookings: T[],
  weekStart: Date
): Map<string, TimelineBar<T>[]> {
  const byCamera = new Map<string, TimelineBar<T>[]>();
  const sorted = [...bookings].sort((a, b) => a.start.getTime() - b.start.getTime());
  const laneEndCols = new Map<string, number[]>(); // cameraId → cột cuối đang chiếm của từng làn

  for (const booking of sorted) {
    const startDay = Math.floor((booking.start.getTime() - weekStart.getTime()) / MS_PER_DAY);
    // Kết thúc đúng 00:00 thì thuộc về ngày hôm trước; luôn chiếm ít nhất một ngày.
    const endDay = Math.max(
      startDay,
      Math.floor((booking.end.getTime() - 1 - weekStart.getTime()) / MS_PER_DAY)
    );
    if (endDay < 0 || startDay > DAYS_IN_WEEK - 1) continue;

    const firstCol = Math.max(startDay, 0);
    const lastCol = Math.min(endDay, DAYS_IN_WEEK - 1);

    const lanes = laneEndCols.get(booking.cameraId) ?? [];
    let lane = lanes.findIndex((lastUsedCol) => lastUsedCol < firstCol);
    if (lane === -1) lane = lanes.length;
    lanes[lane] = lastCol;
    laneEndCols.set(booking.cameraId, lanes);

    const bars = byCamera.get(booking.cameraId) ?? [];
    bars.push({
      booking,
      startCol: firstCol + 1,
      span: lastCol - firstCol + 1,
      lane,
      continuesBefore: startDay < 0,
      continuesAfter: endDay > DAYS_IN_WEEK - 1,
    });
    byCamera.set(booking.cameraId, bars);
  }

  return byCamera;
}

/** Số làn mà dòng của một máy cần (tối thiểu 1). */
export function countLanes(bars: TimelineBar<TimelineBooking>[] | undefined): number {
  return Math.max(1, ...(bars ?? []).map((bar) => bar.lane + 1));
}
