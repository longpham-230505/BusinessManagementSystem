import type {
  CameraInstanceStatus,
  DepositKind,
  OrderStatus,
  OrderType,
  PaymentMethod,
} from "@prisma/client";

/** Nhãn tiếng Việt cho các enum — dùng thay vì in thẳng giá trị enum ra giao diện. */

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_BOOKING_DEPOSIT: "Chờ cọc giữ chỗ",
  BOOKED: "Đã đặt máy",
  RENTING: "Đang thuê",
  RETURNED: "Đã trả máy",
  PENDING: "Chờ xử lý",
  PAID: "Đã thanh toán",
  DELIVERING: "Đang giao",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

export const CAMERA_STATUS_LABEL: Record<CameraInstanceStatus, string> = {
  IN_SERVICE: "Đang phục vụ",
  MAINTENANCE: "Bảo trì",
  RETIRED: "Ngừng sử dụng",
};

export const DEPOSIT_KIND_LABEL: Record<DepositKind, string> = {
  BOOKING: "Cọc giữ chỗ",
  SECURITY_CASH: "Cọc tiền mặt",
  SECURITY_ITEM: "Cọc tài sản",
  SECURITY_NONE: "Không cọc",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  OTHER: "Khác",
};

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  RENTAL: "Thuê máy",
  FILM_SALE: "Bán phim",
  PHOTO_PRINT: "In ảnh",
};

/** Màu thanh lượt thuê trên bảng lịch máy (class Tailwind viết đầy đủ để không bị lược bỏ khi build). */
export type RentalTimelineTone =
  | "PENDING_BOOKING_DEPOSIT"
  | "BOOKED"
  | "RENTING"
  | "OVERDUE"
  | "RETURNED"
  | "COMPLETED";

export const RENTAL_TIMELINE_STYLE: Record<
  RentalTimelineTone,
  { label: string; className: string }
> = {
  PENDING_BOOKING_DEPOSIT: {
    label: "Chờ cọc giữ chỗ",
    className: "border-gray-300 bg-gray-200 text-gray-800",
  },
  BOOKED: { label: "Đã đặt máy", className: "border-blue-300 bg-blue-100 text-blue-900" },
  RENTING: { label: "Đang thuê", className: "border-green-300 bg-green-100 text-green-900" },
  OVERDUE: { label: "Trễ hạn trả", className: "border-red-300 bg-red-100 text-red-900" },
  RETURNED: { label: "Đã trả máy", className: "border-amber-300 bg-amber-100 text-amber-900" },
  COMPLETED: { label: "Hoàn tất", className: "border-stone-300 bg-stone-100 text-stone-600" },
};
