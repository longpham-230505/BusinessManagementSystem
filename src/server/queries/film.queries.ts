import { prisma } from "@/server/db";

/** Các truy vấn đọc dữ liệu kho phim. */

/** Loại phim kèm tồn kho hiện tại (tổng `quantity_remaining` của mọi lô). */
export async function listFilmTypesWithStock() {
  const [filmTypes, stockByType] = await Promise.all([
    prisma.filmType.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.filmBatch.groupBy({
      by: ["filmTypeId"],
      where: { deletedAt: null },
      _sum: { quantityRemaining: true },
    }),
  ]);

  const stockMap = new Map(
    stockByType.map((row) => [row.filmTypeId, row._sum.quantityRemaining ?? 0])
  );
  return filmTypes.map((filmType) => ({ ...filmType, stock: stockMap.get(filmType.id) ?? 0 }));
}

/** Các lô nhập (mới nhất trước) kèm loại phim; dùng cho bảng lô và giá trị tồn. */
export function listFilmBatches() {
  return prisma.filmBatch.findMany({
    where: { deletedAt: null },
    include: { filmType: true },
    orderBy: [{ receivedDate: "desc" }, { id: "desc" }],
  });
}

const RECENT_ADJUSTMENT_LIMIT = 20;

export function listRecentStockAdjustments() {
  return prisma.filmStockAdjustment.findMany({
    include: { filmBatch: { include: { filmType: true } } },
    orderBy: { adjustedAt: "desc" },
    take: RECENT_ADJUSTMENT_LIMIT,
  });
}
