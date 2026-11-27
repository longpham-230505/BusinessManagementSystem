/**
 * Kết quả của Server Action chạy trong hộp thoại (popup).
 * Khác với action thông thường (redirect kèm thông báo), action này TRẢ VỀ kết quả để
 * hộp thoại giữ nguyên dữ liệu đang nhập và hiện lỗi ngay tại chỗ khi có sự cố.
 */
export type DialogActionResult<T = undefined> =
  { ok: true; notice: string; data: T } | { ok: false; message: string };
