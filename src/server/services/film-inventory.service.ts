import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { BusinessRuleError } from "@/server/errors";
import { planFifoAllocation, type StockBatch } from "@/server/services/fifo";
import type { Db } from "@/server/services/types";

/**
 * Kho phim: nhập lô, điều chỉnh tồn, và engine FIFO dùng chung cho cả đơn bán
 * phim lẫn đơn in ảnh có dùng phim (cùng một bể tồn kho cho mọi cơ sở).
 */

// ---------------------------------------------------------------------------
// Nhập lô và điều chỉnh tồn
// ---------------------------------------------------------------------------

/** Nhập một lô phim mới. Số lượng còn lại ban đầu bằng số lượng nhập. */
export async function importFilmBatch(input: {
  filmTypeId: string;
  quantity: number;
  unitCost: Prisma.Decimal;
  receivedDate: Date;
  notes: string | null;
}) {
  const { filmTypeId, quantity, unitCost, receivedDate, notes } = input;

  return prisma.filmBatch.create({
    data: {
      filmTypeId,
      quantityOriginal: quantity,
      quantityRemaining: quantity,
      unitCost,
      receivedDate,
      notes,
    },
    select: { id: true },
  });
}

/**
 * Điều chỉnh tồn của một lô (kiểm kê, hao hụt, hư hỏng).
 * `quantityDelta` âm = hao hụt (tính là chi phí theo giá vốn của lô), dương = tìm thấy thêm.
 */
export async function adjustFilmStock(input: {
  batchId: string;
  quantityDelta: number;
  reason: string;
  at?: Date;
}) {
  const { batchId, quantityDelta, reason, at = new Date() } = input;

  await prisma.$transaction(async (db) => {
    // Cập nhật có điều kiện: không bao giờ để tồn của lô âm, kể cả khi có người khác đang dùng phim.
    const { count } = await db.filmBatch.updateMany({
      where: {
        id: batchId,
        deletedAt: null,
        ...(quantityDelta < 0 ? { quantityRemaining: { gte: -quantityDelta } } : {}),
      },
      data: { quantityRemaining: { increment: quantityDelta } },
    });
    if (count === 0) {
      throw new BusinessRuleError(
        quantityDelta < 0 ? "Lô không đủ tồn để trừ số lượng này." : "Không tìm thấy lô phim."
      );
    }

    await db.filmStockAdjustment.create({
      data: { filmBatchId: batchId, quantityDelta, reason, adjustedAt: at },
    });
  });
}

/**
 * Xóa mềm một lô nhập nhầm. Chỉ cho phép khi lô chưa từng được dùng hay điều chỉnh,
 * vì xóa lô đã có phát sinh sẽ làm sai giá vốn của các đơn cũ.
 */
export async function deleteUnusedFilmBatch(batchId: string, at: Date = new Date()) {
  await prisma.$transaction(async (db) => {
    const [consumptionCount, adjustmentCount] = await Promise.all([
      db.filmBatchConsumption.count({ where: { filmBatchId: batchId } }),
      db.filmStockAdjustment.count({ where: { filmBatchId: batchId } }),
    ]);
    if (consumptionCount > 0 || adjustmentCount > 0) {
      throw new BusinessRuleError(
        "Lô này đã được dùng hoặc điều chỉnh nên không thể xóa. Hãy dùng điều chỉnh tồn."
      );
    }

    const { count } = await db.filmBatch.updateMany({
      where: { id: batchId, deletedAt: null },
      data: { deletedAt: at },
    });
    if (count === 0) throw new BusinessRuleError("Không tìm thấy lô phim.");
  });
}

// ---------------------------------------------------------------------------
// Engine FIFO
// ---------------------------------------------------------------------------

/** Dòng của đơn đang tiêu thụ phim: một dòng bán phim HOẶC một dòng in ảnh. */
export type ConsumptionOwner = { filmSaleItemId: string } | { photoPrintItemId: string };

type LockedBatchRow = {
  id: string;
  quantity_remaining: number;
  unit_cost: Prisma.Decimal | string | number;
};

/**
 * Lấy các lô còn hàng của một loại phim theo thứ tự FIFO (`received_date ASC, id ASC`)
 * và KHÓA các dòng đó (`FOR UPDATE`) đến hết transaction, để hai đơn tạo cùng lúc
 * không thể cùng lấy một phần tồn kho.
 */
async function lockBatchesInFifoOrder(db: Db, filmTypeId: string): Promise<StockBatch[]> {
  const rows = await db.$queryRaw<LockedBatchRow[]>`
    SELECT id, quantity_remaining, unit_cost
    FROM film_batches
    WHERE film_type_id = ${filmTypeId}::uuid
      AND deleted_at IS NULL
      AND quantity_remaining > 0
    ORDER BY received_date ASC, id ASC
    FOR UPDATE`;

  return rows.map((row) => ({
    id: row.id,
    quantityRemaining: Number(row.quantity_remaining),
    unitCost: new Prisma.Decimal(row.unit_cost.toString()),
  }));
}

/**
 * Phân bổ `quantity` phim loại `filmTypeId` cho một dòng đơn: trừ tồn các lô theo
 * FIFO và ghi FilmBatchConsumptions (kèm snapshot giá vốn). Chặn nếu vượt tồn.
 */
export async function allocateFilm(
  db: Db,
  input: { filmTypeId: string; quantity: number; owner: ConsumptionOwner }
) {
  const { filmTypeId, quantity, owner } = input;

  const batches = await lockBatchesInFifoOrder(db, filmTypeId);
  const { allocations, shortfall } = planFifoAllocation(batches, quantity);

  if (shortfall > 0) {
    const filmType = await db.filmType.findUnique({
      where: { id: filmTypeId },
      select: { name: true },
    });
    throw new BusinessRuleError(
      `Không đủ tồn kho phim "${filmType?.name ?? "?"}": cần ${quantity}, chỉ còn ${quantity - shortfall}.`
    );
  }

  for (const allocation of allocations) {
    await db.filmBatch.update({
      where: { id: allocation.batchId },
      data: { quantityRemaining: { decrement: allocation.quantity } },
    });
    await db.filmBatchConsumption.create({
      data: {
        ...owner,
        filmBatchId: allocation.batchId,
        quantity: allocation.quantity,
        unitCost: allocation.unitCost,
      },
    });
  }
}

/**
 * Giải phóng TOÀN BỘ phim mà một đơn đã tiêu thụ: trả lại `quantity_remaining` cho
 * từng lô rồi xóa các consumption. Dùng khi sửa đơn (trước khi phân bổ lại) và khi hủy đơn.
 * Không đụng tới giá vốn của các đơn khác.
 */
export async function releaseOrderFilm(db: Db, orderId: string) {
  const consumptions = await db.filmBatchConsumption.findMany({
    where: {
      OR: [{ filmSaleItem: { orderId } }, { photoPrintItem: { orderId } }],
    },
    select: { id: true, filmBatchId: true, quantity: true },
  });
  if (consumptions.length === 0) return;

  const quantityByBatch = new Map<string, number>();
  for (const { filmBatchId, quantity } of consumptions) {
    quantityByBatch.set(filmBatchId, (quantityByBatch.get(filmBatchId) ?? 0) + quantity);
  }

  for (const [batchId, quantity] of quantityByBatch) {
    await db.filmBatch.update({
      where: { id: batchId },
      data: { quantityRemaining: { increment: quantity } },
    });
  }
  await db.filmBatchConsumption.deleteMany({
    where: { id: { in: consumptions.map((consumption) => consumption.id) } },
  });
}

/** Chặn các loại phim không tồn tại, đã xóa hoặc đã ngưng sử dụng. */
export async function assertFilmTypesUsable(db: Db, filmTypeIds: string[]) {
  const uniqueIds = [...new Set(filmTypeIds)];
  if (uniqueIds.length === 0) return;

  const usableCount = await db.filmType.count({
    where: { id: { in: uniqueIds }, deletedAt: null, active: true },
  });
  if (usableCount !== uniqueIds.length) {
    throw new BusinessRuleError("Có loại phim không tồn tại hoặc đã ngưng sử dụng.");
  }
}
