import { Prisma } from "@prisma/client";

/**
 * Phân bổ tồn kho phim theo FIFO — hàm thuần, không đụng database.
 *
 * Ví dụ (spec mục 8.4): Batch A 20 @ 180.000, Batch B 30 @ 195.000; khách mua 25
 * → lấy 20 từ A và 5 từ B, giá vốn = 20×180.000 + 5×195.000 = 4.575.000.
 */

export type StockBatch = {
  id: string;
  quantityRemaining: number;
  unitCost: Prisma.Decimal;
};

export type FifoAllocation = {
  batchId: string;
  quantity: number;
  unitCost: Prisma.Decimal;
};

export type FifoPlan = {
  allocations: FifoAllocation[];
  /** Số lượng còn thiếu (> 0 nghĩa là tồn kho không đủ). */
  shortfall: number;
};

/**
 * @param batches các lô còn hàng, ĐÃ được sắp theo `received_date ASC, id ASC`
 * @param quantity số lượng cần lấy
 */
export function planFifoAllocation(batches: StockBatch[], quantity: number): FifoPlan {
  const allocations: FifoAllocation[] = [];
  let needed = quantity;

  for (const batch of batches) {
    if (needed === 0) break;
    if (batch.quantityRemaining <= 0) continue;

    const taken = Math.min(batch.quantityRemaining, needed);
    allocations.push({ batchId: batch.id, quantity: taken, unitCost: batch.unitCost });
    needed -= taken;
  }

  return { allocations, shortfall: needed };
}

/** Tổng giá vốn của các lần tiêu thụ: Σ số lượng × giá vốn lô. */
export function sumConsumptionCost(
  consumptions: { quantity: number; unitCost: Prisma.Decimal }[]
): Prisma.Decimal {
  return consumptions.reduce(
    (total, item) => total.add(item.unitCost.mul(item.quantity)),
    new Prisma.Decimal(0)
  );
}
