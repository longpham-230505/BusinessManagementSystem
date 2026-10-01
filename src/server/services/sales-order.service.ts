import { OrderStatus, OrderType, type Prisma } from "@prisma/client";
import { ORDER_STATUS_LABEL } from "@/lib/labels";
import { prisma } from "@/server/db";
import { BusinessRuleError } from "@/server/errors";
import { releaseOrderFilm } from "@/server/services/film-inventory.service";
import type { Db } from "@/server/services/types";

/**
 * Phần dùng chung của đơn bán phim (FILM_SALE) và đơn in ảnh (PHOTO_PRINT):
 *
 *   PENDING → PAID → DELIVERING → COMPLETED        (CANCELLED bất kỳ lúc nào)
 *
 * Theo spec mục 11.2: hệ thống KHÔNG ép đúng thứ tự — được bỏ qua bước (khách nhận
 * tại chỗ, COD...) và được chuyển ngược (kể cả khỏi COMPLETED).
 */

export const SALES_ORDER_TYPES: OrderType[] = [OrderType.FILM_SALE, OrderType.PHOTO_PRINT];

/** Các trạng thái chọn được khi chuyển trạng thái (CANCELLED có thao tác riêng). */
export const SALES_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.PAID,
  OrderStatus.DELIVERING,
  OrderStatus.COMPLETED,
] as const;

export type SalesStatus = (typeof SALES_STATUSES)[number];

/** Các trường chung của hai loại đơn. */
export type SalesOrderHeader = {
  customerId: string;
  branchId: string;
  shippingFee: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  notes: string | null;
};

/**
 * Cập nhật phần đầu của đơn và KHÓA dòng đơn đến hết transaction.
 * Phải gọi đầu tiên khi sửa đơn: nếu hai người cùng sửa, người thứ hai sẽ chờ rồi
 * thấy dữ liệu đã được người thứ nhất cập nhật, nên không giải phóng tồn kho hai lần.
 */
export async function updateOrderHeaderAndLock(
  db: Db,
  orderId: string,
  orderType: OrderType,
  header: SalesOrderHeader
) {
  const { count } = await db.order.updateMany({
    where: {
      id: orderId,
      orderType,
      deletedAt: null,
      status: { not: OrderStatus.CANCELLED },
    },
    data: header,
  });
  if (count === 0) {
    throw new BusinessRuleError("Không tìm thấy đơn, hoặc đơn đã bị hủy nên không thể sửa.");
  }
}

/** Chuyển trạng thái đơn (không gồm hủy). Ghi/xóa `completed_at` theo trạng thái mới. */
export async function changeSalesOrderStatus(input: {
  orderId: string;
  status: SalesStatus;
  at?: Date;
}) {
  const { orderId, status, at = new Date() } = input;

  const { count } = await prisma.order.updateMany({
    where: {
      id: orderId,
      orderType: { in: SALES_ORDER_TYPES },
      deletedAt: null,
      // Không chuyển sang chính trạng thái hiện tại, và không chuyển đơn đã hủy.
      status: { in: SALES_STATUSES.filter((candidate) => candidate !== status) },
    },
    data: { status, completedAt: status === OrderStatus.COMPLETED ? at : null },
  });

  if (count === 0) {
    throw new BusinessRuleError(
      `Không thể chuyển đơn sang "${ORDER_STATUS_LABEL[status]}": đơn không tồn tại, đã hủy hoặc đã ở trạng thái này.`
    );
  }
}

/** Hủy đơn và trả lại toàn bộ phim đã phân bổ về kho. */
export async function cancelSalesOrder(input: { orderId: string; at?: Date }) {
  const { orderId, at = new Date() } = input;

  await prisma.$transaction(async (db) => {
    const { count } = await db.order.updateMany({
      where: {
        id: orderId,
        orderType: { in: SALES_ORDER_TYPES },
        deletedAt: null,
        status: { in: [...SALES_STATUSES] },
      },
      data: { status: OrderStatus.CANCELLED, cancelledAt: at, completedAt: null },
    });
    if (count === 0) {
      throw new BusinessRuleError("Không tìm thấy đơn, hoặc đơn đã bị hủy trước đó.");
    }

    await releaseOrderFilm(db, orderId);
  });
}
