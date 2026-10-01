import { Prisma } from "@prisma/client";

/**
 * Lỗi nghiệp vụ hoặc dữ liệu nhập sai.
 * `message` được viết cho người dùng cuối nên an toàn để hiển thị trực tiếp.
 */
export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessRuleError";
  }
}

const UNEXPECTED_ERROR_MESSAGE =
  "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.";
const DOUBLE_BOOKING_MESSAGE = "Máy đã có lịch thuê trùng thời gian.";

/** Thông điệp cho một số mã lỗi Prisma thường gặp. */
const PRISMA_ERROR_MESSAGES: Record<string, string> = {
  P2002: "Dữ liệu trùng với bản ghi đang hoạt động.",
  P2003: "Dữ liệu liên quan không tồn tại hoặc đã bị xóa.",
  P2025: "Không tìm thấy bản ghi cần xử lý.",
};

/** Tên exclusion constraint chống double booking (xem prisma/migrations/*_manual_changes). */
const DOUBLE_BOOKING_CONSTRAINT = "no_double_booking";
/** CHECK constraint chặn tồn kho phim âm (xem migration manual_changes). */
const NEGATIVE_STOCK_CONSTRAINT = "film_batches_quantity_remaining_nonneg";
const NEGATIVE_STOCK_MESSAGE =
  "Tồn kho phim không đủ (có thể vừa có thao tác khác dùng phim). Hãy tải lại trang và thử lại.";

/** SQLSTATE của exclusion_violation trong PostgreSQL. */
const EXCLUSION_VIOLATION_CODE = "23P01";

/**
 * Prisma không map exclusion constraint thành mã P-code riêng, nên nhận diện
 * bằng tên constraint / SQLSTATE trong nội dung lỗi.
 */
function isDoubleBookingViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes(DOUBLE_BOOKING_CONSTRAINT) ||
      error.message.includes(EXCLUSION_VIOLATION_CODE))
  );
}

/**
 * Chuyển lỗi bất kỳ thành thông điệp an toàn để hiển thị.
 * Lỗi không nhận diện được sẽ được log ở server và KHÔNG lộ chi tiết ra giao diện.
 */
export function toUserMessage(error: unknown): string {
  if (error instanceof BusinessRuleError) return error.message;
  if (isDoubleBookingViolation(error)) return DOUBLE_BOOKING_MESSAGE;
  if (error instanceof Error && error.message.includes(NEGATIVE_STOCK_CONSTRAINT)) {
    return NEGATIVE_STOCK_MESSAGE;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const message = PRISMA_ERROR_MESSAGES[error.code];
    if (message) return message;
  }

  console.error("[ABMS] Lỗi không mong đợi:", error);
  return UNEXPECTED_ERROR_MESSAGE;
}
