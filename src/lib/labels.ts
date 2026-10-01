import type {
  CameraInstanceStatus,
  DepositKind,
  OrderStatus,
  OrderType,
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

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  RENTAL: "Thuê máy",
  FILM_SALE: "Bán phim",
  PHOTO_PRINT: "In ảnh",
};
