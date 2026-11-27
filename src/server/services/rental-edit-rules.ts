import { OrderStatus } from "@prisma/client";

/**
 * Quy tắc sửa đơn thuê theo trạng thái — hàm thuần, không đụng database.
 *
 * Khách, cơ sở và ghi chú luôn sửa được (trừ đơn đã hủy). Lịch thuê và danh sách máy
 * bị khóa dần theo vòng đời, vì máy đã giao đi thì không thể "đổi máy" hay "đổi ngày nhận":
 *
 *   Chờ cọc / Đã đặt máy → sửa được mọi thứ
 *   Đang thuê            → chỉ gia hạn / đổi hạn trả (và khách, cơ sở, ghi chú)
 *   Đã trả / Hoàn tất    → chỉ khách, cơ sở, ghi chú
 */

export type RentalEditPermissions = {
  canChangeCameras: boolean;
  canChangePickup: boolean;
  canChangeReturnDue: boolean;
};

const FULLY_EDITABLE: RentalEditPermissions = {
  canChangeCameras: true,
  canChangePickup: true,
  canChangeReturnDue: true,
};

const HEADER_ONLY: RentalEditPermissions = {
  canChangeCameras: false,
  canChangePickup: false,
  canChangeReturnDue: false,
};

/** Trả về quyền sửa theo trạng thái; `null` nghĩa là đơn không còn sửa được (đã hủy). */
export function getRentalEditPermissions(status: OrderStatus): RentalEditPermissions | null {
  switch (status) {
    case OrderStatus.PENDING_BOOKING_DEPOSIT:
    case OrderStatus.BOOKED:
      return FULLY_EDITABLE;
    case OrderStatus.RENTING:
      return { ...HEADER_ONLY, canChangeReturnDue: true };
    case OrderStatus.RETURNED:
    case OrderStatus.COMPLETED:
      return HEADER_ONLY;
    default:
      return null;
  }
}

/** Các trạng thái mà đơn thuê còn được phép sửa. */
export const EDITABLE_RENTAL_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING_BOOKING_DEPOSIT,
  OrderStatus.BOOKED,
  OrderStatus.RENTING,
  OrderStatus.RETURNED,
  OrderStatus.COMPLETED,
];

/** So sánh danh sách máy hiện tại với danh sách mới: máy giữ nguyên, thêm vào, bỏ đi. */
export function diffCameraIds(currentIds: string[], requestedIds: string[]) {
  const current = new Set(currentIds);
  const requested = new Set(requestedIds);

  return {
    added: requestedIds.filter((id) => !current.has(id)),
    removed: currentIds.filter((id) => !requested.has(id)),
    kept: currentIds.filter((id) => requested.has(id)),
  };
}
