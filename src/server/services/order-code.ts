import { OrderType, Prisma } from "@prisma/client";
import { vnDateStamp } from "@/lib/datetime";
import type { Db } from "@/server/services/types";

const ORDER_CODE_PREFIX: Record<OrderType, string> = {
  RENTAL: "RNT",
  FILM_SALE: "FLM",
  PHOTO_PRINT: "PRT",
};
const SEQUENCE_DIGITS = 3;

/**
 * Sinh mã đơn dạng `<PREFIX>-YYMMDD-001` (ngày theo giờ Việt Nam), prefix theo loại đơn:
 * RNT (thuê máy), FLM (bán phim), PRT (in ảnh).
 * Số thứ tự = số lớn nhất trong ngày + 1 (không dùng count, vì count sẽ sinh trùng
 * mã sau khi có đơn bị xóa mềm).
 *
 * Nếu hai người tạo đơn cùng một lúc, partial unique index trên `order_code` sẽ
 * chặn mã trùng và người tạo sau chỉ cần bấm tạo lại.
 */
const ORDER_CODE_MAX_ATTEMPTS = 3;

/** Tên partial unique index chặn trùng mã đơn (xem migration manual_changes). */
const ORDER_CODE_INDEX = "orders_order_code_active_key";

function isOrderCodeCollision(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  const target = JSON.stringify(error.meta?.target ?? "");
  return (
    target.includes("order_code") ||
    target.includes(ORDER_CODE_INDEX) ||
    error.message.includes(ORDER_CODE_INDEX)
  );
}

/**
 * Chạy `createOrder` (một transaction có sinh mã đơn); nếu hai người tạo đơn cùng lúc
 * và trùng mã thì chạy lại để lấy số thứ tự kế tiếp, thay vì bắt người dùng bấm lại.
 */
export async function withOrderCodeRetry<T>(createOrder: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await createOrder();
    } catch (error) {
      if (attempt >= ORDER_CODE_MAX_ATTEMPTS || !isOrderCodeCollision(error)) throw error;
    }
  }
}

export async function generateOrderCode(
  db: Db,
  orderType: OrderType,
  now: Date = new Date()
): Promise<string> {
  const prefix = `${ORDER_CODE_PREFIX[orderType]}-${vnDateStamp(now)}-`;

  const latest = await db.order.findFirst({
    where: { orderCode: { startsWith: prefix } },
    orderBy: { orderCode: "desc" },
    select: { orderCode: true },
  });

  const latestSequence = latest ? Number(latest.orderCode.slice(prefix.length)) : 0;
  const nextSequence = String(latestSequence + 1).padStart(SEQUENCE_DIGITS, "0");
  return `${prefix}${nextSequence}`;
}
