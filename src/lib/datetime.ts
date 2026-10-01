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

/** Chuyển một thời điểm thành giá trị cho `<input type="datetime-local">` theo giờ Việt Nam. */
export function toVnDateTimeLocal(date: Date): string {
  return new Date(date.getTime() + VN_UTC_OFFSET_MS).toISOString().slice(0, 16);
}
