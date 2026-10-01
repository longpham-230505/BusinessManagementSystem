import { OrderType } from "@prisma/client";
import { prisma } from "@/server/db";
import { listFilmTypesWithStock } from "@/server/queries/film.queries";

/** Các truy vấn đọc dùng chung cho mọi loại đơn. */

export async function findOrderType(id: string): Promise<OrderType | null> {
  const order = await prisma.order.findFirst({
    where: { id, deletedAt: null },
    select: { orderType: true },
  });
  return order?.orderType ?? null;
}

/**
 * Danh sách đơn, có thể lọc theo loại; kèm dữ liệu để tóm tắt từng loại.
 * Thứ tự hiển thị xem `sortOrdersForList`.
 */
export async function listOrders(type?: OrderType) {
  const orders = await prisma.order.findMany({
    where: { deletedAt: null, ...(type ? { orderType: type } : {}) },
    include: {
      customer: true,
      branch: true,
      rentalDetail: true,
      rentalItems: { include: { cameraInstance: true } },
      filmSaleItems: { include: { filmType: true } },
      photoPrintItems: { include: { printService: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return sortOrdersForList(orders);
}

type SortableOrder = {
  orderType: OrderType;
  createdAt: Date;
  rentalDetail: { pickupAt: Date } | null;
};

/**
 * Thứ tự hiển thị trong danh sách đơn:
 * - Đơn thuê máy trước, xếp theo NGÀY NHẬN MÁY tăng dần (đơn nhận sớm nằm trên),
 *   không phụ thuộc thời điểm đơn được nhập vào hệ thống.
 * - Đơn bán phim / in ảnh sau, mới tạo nhất nằm trên.
 */
export function sortOrdersForList<T extends SortableOrder>(orders: T[]): T[] {
  const isRental = (order: T) => order.orderType === "RENTAL";

  return [...orders].sort((a, b) => {
    if (isRental(a) !== isRental(b)) return isRental(a) ? -1 : 1;

    if (isRental(a)) {
      const pickupA = a.rentalDetail?.pickupAt.getTime() ?? Infinity;
      const pickupB = b.rentalDetail?.pickupAt.getTime() ?? Infinity;
      return pickupA - pickupB || a.createdAt.getTime() - b.createdAt.getTime();
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export type OrderListItem = Awaited<ReturnType<typeof listOrders>>[number];

/** Chi tiết đơn bán phim / in ảnh, kèm các lô phim đã tiêu thụ (để xem giá vốn FIFO). */
export function findSalesOrderDetail(id: string) {
  return prisma.order.findFirst({
    where: {
      id,
      deletedAt: null,
      orderType: { in: [OrderType.FILM_SALE, OrderType.PHOTO_PRINT] },
    },
    include: {
      customer: true,
      branch: true,
      filmSaleItems: {
        include: { filmType: true, consumptions: { include: { filmBatch: true } } },
      },
      photoPrintItems: {
        include: {
          printService: true,
          filmType: true,
          consumptions: { include: { filmBatch: true } },
        },
      },
    },
  });
}

export type SalesOrderDetail = NonNullable<Awaited<ReturnType<typeof findSalesOrderDetail>>>;

/** Dữ liệu cho các ô chọn của form tạo/sửa đơn bán phim và in ảnh. */
export async function loadSalesOrderFormOptions() {
  const [customers, branches, filmTypes, printServices] = await Promise.all([
    prisma.customer.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    listFilmTypesWithStock(),
    prisma.printService.findMany({
      where: { deletedAt: null, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    customers,
    branches,
    filmTypes: filmTypes.filter((filmType) => filmType.active),
    printServices,
  };
}
