import { OrderStatus, OrderType, type Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { BusinessRuleError } from "@/server/errors";
import {
  allocateFilm,
  assertFilmTypesUsable,
  releaseOrderFilm,
} from "@/server/services/film-inventory.service";
import { generateOrderCode } from "@/server/services/order-code";
import { assertDiscountWithinSubtotal, sumLineTotals } from "@/server/services/order-totals";
import {
  updateOrderHeaderAndLock,
  type SalesOrderHeader,
} from "@/server/services/sales-order.service";
import type { Db } from "@/server/services/types";

/** Đơn bán phim: mỗi dòng là một loại phim; tạo/sửa đơn sẽ phân bổ FIFO ngay (giữ hàng). */

export type FilmSaleLine = {
  filmTypeId: string;
  quantity: number;
  salePrice: Prisma.Decimal;
};

export type FilmSaleOrderInput = SalesOrderHeader & { items: FilmSaleLine[] };

export async function createFilmSaleOrder(input: FilmSaleOrderInput): Promise<{ id: string }> {
  const { items, ...header } = input;
  validateFilmSaleInput(input);

  return prisma.$transaction(async (db) => {
    const order = await db.order.create({
      data: {
        ...header,
        orderCode: await generateOrderCode(db, OrderType.FILM_SALE),
        orderType: OrderType.FILM_SALE,
        status: OrderStatus.PENDING,
        orderDate: new Date(),
      },
      select: { id: true },
    });

    await addFilmSaleItems(db, order.id, items);
    return order;
  });
}

/**
 * Sửa đơn bán phim: giải phóng toàn bộ phim đã phân bổ cho đơn này, thay các dòng
 * bằng dữ liệu mới rồi phân bổ lại từ tồn kho hiện tại (spec mục 8.4, quy tắc 4).
 */
export async function updateFilmSaleOrder(orderId: string, input: FilmSaleOrderInput) {
  const { items, ...header } = input;
  validateFilmSaleInput(input);

  await prisma.$transaction(async (db) => {
    await updateOrderHeaderAndLock(db, orderId, OrderType.FILM_SALE, header);
    await releaseOrderFilm(db, orderId);
    await db.filmSaleItem.deleteMany({ where: { orderId } });
    await addFilmSaleItems(db, orderId, items);
  });
}

function validateFilmSaleInput({ items, discountAmount }: FilmSaleOrderInput) {
  if (items.length === 0) {
    throw new BusinessRuleError("Đơn bán phim cần ít nhất một loại phim.");
  }
  const subtotal = sumLineTotals(
    items.map((item) => ({ quantity: item.quantity, unitPrice: item.salePrice }))
  );
  assertDiscountWithinSubtotal(discountAmount, subtotal);
}

async function addFilmSaleItems(db: Db, orderId: string, items: FilmSaleLine[]) {
  await assertFilmTypesUsable(
    db,
    items.map((item) => item.filmTypeId)
  );

  // Khóa kho theo thứ tự loại phim cố định để hai đơn đồng thời không khóa chéo nhau (deadlock).
  const sortedItems = [...items].sort((a, b) => a.filmTypeId.localeCompare(b.filmTypeId));

  for (const item of sortedItems) {
    const created = await db.filmSaleItem.create({
      data: {
        orderId,
        filmTypeId: item.filmTypeId,
        quantity: item.quantity,
        salePrice: item.salePrice,
      },
      select: { id: true },
    });
    await allocateFilm(db, {
      filmTypeId: item.filmTypeId,
      quantity: item.quantity,
      owner: { filmSaleItemId: created.id },
    });
  }
}
