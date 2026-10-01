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

/**
 * Đơn in ảnh: mỗi dòng là một dịch vụ in. Dòng có thể gắn một loại phim và số
 * lượng phim dùng — phần này tiêu thụ kho phim theo FIFO giống hệt đơn bán phim.
 */

export type PhotoPrintLine = {
  printServiceId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  /** Phim tiêu thụ (không bắt buộc). `filmTypeId` và `filmQuantity` luôn đi cùng nhau. */
  filmTypeId: string | null;
  filmQuantity: number | null;
};

export type PhotoPrintOrderInput = SalesOrderHeader & { items: PhotoPrintLine[] };

export async function createPhotoPrintOrder(input: PhotoPrintOrderInput): Promise<{ id: string }> {
  const { items, ...header } = input;
  validatePhotoPrintInput(input);

  return prisma.$transaction(async (db) => {
    const order = await db.order.create({
      data: {
        ...header,
        orderCode: await generateOrderCode(db, OrderType.PHOTO_PRINT),
        orderType: OrderType.PHOTO_PRINT,
        status: OrderStatus.PENDING,
        orderDate: new Date(),
      },
      select: { id: true },
    });

    await addPhotoPrintItems(db, order.id, items);
    return order;
  });
}

/** Sửa đơn in ảnh: giải phóng phim đã dùng, thay các dòng, rồi phân bổ lại. */
export async function updatePhotoPrintOrder(orderId: string, input: PhotoPrintOrderInput) {
  const { items, ...header } = input;
  validatePhotoPrintInput(input);

  await prisma.$transaction(async (db) => {
    await updateOrderHeaderAndLock(db, orderId, OrderType.PHOTO_PRINT, header);
    await releaseOrderFilm(db, orderId);
    await db.photoPrintItem.deleteMany({ where: { orderId } });
    await addPhotoPrintItems(db, orderId, items);
  });
}

function validatePhotoPrintInput({ items, discountAmount }: PhotoPrintOrderInput) {
  if (items.length === 0) {
    throw new BusinessRuleError("Đơn in ảnh cần ít nhất một dịch vụ in.");
  }
  const subtotal = sumLineTotals(
    items.map((item) => ({ quantity: item.quantity, unitPrice: item.unitPrice }))
  );
  assertDiscountWithinSubtotal(discountAmount, subtotal);
}

async function addPhotoPrintItems(db: Db, orderId: string, items: PhotoPrintLine[]) {
  await assertPrintServicesUsable(
    db,
    items.map((item) => item.printServiceId)
  );
  await assertFilmTypesUsable(
    db,
    items.flatMap((item) => (item.filmTypeId ? [item.filmTypeId] : []))
  );

  // Dòng không dùng phim xếp trước; dòng dùng phim khóa kho theo thứ tự loại phim cố định (tránh deadlock).
  const sortedItems = [...items].sort((a, b) =>
    (a.filmTypeId ?? "").localeCompare(b.filmTypeId ?? "")
  );

  for (const item of sortedItems) {
    const created = await db.photoPrintItem.create({
      data: {
        orderId,
        printServiceId: item.printServiceId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        filmTypeId: item.filmTypeId,
        filmQuantity: item.filmQuantity,
      },
      select: { id: true },
    });

    if (item.filmTypeId && item.filmQuantity) {
      await allocateFilm(db, {
        filmTypeId: item.filmTypeId,
        quantity: item.filmQuantity,
        owner: { photoPrintItemId: created.id },
      });
    }
  }
}

async function assertPrintServicesUsable(db: Db, printServiceIds: string[]) {
  const uniqueIds = [...new Set(printServiceIds)];
  const usableCount = await db.printService.count({
    where: { id: { in: uniqueIds }, deletedAt: null, active: true },
  });
  if (usableCount !== uniqueIds.length) {
    throw new BusinessRuleError("Có dịch vụ in không tồn tại hoặc đã ngưng sử dụng.");
  }
}
