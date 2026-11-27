/**
 * Xử lý ngày giờ theo múi giờ Việt Nam.
 *
 * Server (Vercel/Netlify/Cloudflare) thường chạy ở UTC, nên KHÔNG được dùng
 * `new Date("2026-10-01T09:00")` để đọc giờ người dùng nhập — chuỗi đó sẽ bị
 * hiểu là 09:00 UTC (tức 16:00 giờ VN). Việt Nam không có giờ mùa hè nên có
 * thể dùng offset cố định +07:00.
 */

export const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

const VN_UTC_OFFSET = "+07:00";
const VN_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Đọc giá trị của `<input type="datetime-local">` như giờ Việt Nam. Trả về null nếu sai định dạng. */
export function parseVnDateTimeLocal(value: string): Date | null {
  if (!DATETIME_LOCAL_PATTERN.test(value)) return null;
  const date = new Date(`${value}${VN_UTC_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Đọc giá trị của `<input type="date">` thành 00:00 UTC (dùng cho cột DATE). Trả về null nếu sai định dạng. */
export function parseDateOnly(value: string): Date | null {
  if (!DATE_ONLY_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Hiển thị thời điểm theo giờ Việt Nam, bất kể server ở múi giờ nào. */
export function formatVnDateTime(date: Date): string {
  return date.toLocaleString("vi-VN", { timeZone: VN_TIME_ZONE });
}

/** Ngày hiện tại theo giờ Việt Nam dạng YYMMDD (dùng cho mã đơn). */
export function vnDateStamp(now: Date): string {
  const vnNow = new Date(now.getTime() + VN_UTC_OFFSET_MS);
  const year = String(vnNow.getUTCFullYear()).slice(-2);
  const month = String(vnNow.getUTCMonth() + 1).padStart(2, "0");
  const day = String(vnNow.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/** Ngày hiện tại theo giờ Việt Nam dạng YYYY-MM-DD (giá trị mặc định cho `<input type="date">`). */
export function vnDateInputValue(now: Date = new Date()): string {
  return new Date(now.getTime() + VN_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

/** Hiển thị giá trị cột DATE (lưu 00:00 UTC) như ngày dd/mm/yyyy, không bị lệch múi giờ. */
export function formatDateOnly(date: Date): string {
  return date.toLocaleDateString("vi-VN", { timeZone: "UTC" });
}

/** Ngày (không kèm giờ) theo giờ Việt Nam, dạng `7/10/2026`. */
export function formatVnDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", { timeZone: VN_TIME_ZONE });
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 00:00 giờ Việt Nam của ngày chứa `date`. */
export function vnStartOfDay(date: Date): Date {
  const vnMs = date.getTime() + VN_UTC_OFFSET_MS;
  return new Date(vnMs - (((vnMs % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY) - VN_UTC_OFFSET_MS);
}

/** 00:00 giờ Việt Nam của thứ Hai đầu tuần chứa `date` (tuần Thứ 2 → Chủ nhật). */
export function vnStartOfWeek(date: Date): Date {
  const dayStart = vnStartOfDay(date);
  const weekday = new Date(dayStart.getTime() + VN_UTC_OFFSET_MS).getUTCDay(); // 0 = Chủ nhật
  return new Date(dayStart.getTime() - ((weekday + 6) % 7) * MS_PER_DAY);
}

/** Cộng `days` ngày (Việt Nam không có giờ mùa hè nên mỗi ngày đúng 24 giờ). */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Ngày theo giờ Việt Nam dạng YYYY-MM-DD. */
export function vnDateKey(date: Date): string {
  return new Date(date.getTime() + VN_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Đọc tham số tuần `YYYY-MM-DD` (ngày bất kỳ trong tuần, theo giờ Việt Nam) và trả về
 * thứ Hai đầu tuần đó. Sai định dạng hoặc để trống thì dùng tuần hiện tại.
 */
export function parseWeekParam(value: string | undefined, now: Date = new Date()): Date {
  const parsed = value ? parseDateOnly(value) : null;
  // `parseDateOnly` trả về 00:00 UTC của ngày đó; đổi sang 00:00 giờ Việt Nam cùng ngày.
  return vnStartOfWeek(parsed ? new Date(parsed.getTime() - VN_UTC_OFFSET_MS) : now);
}

/** Chuyển một thời điểm thành giá trị cho `<input type="datetime-local">` theo giờ Việt Nam. */
export function toVnDateTimeLocal(date: Date): string {
  return new Date(date.getTime() + VN_UTC_OFFSET_MS).toISOString().slice(0, 16);
}
