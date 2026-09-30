import { vnDateStamp } from "@/lib/datetime";
import type { Db } from "@/server/services/types";

const RENTAL_CODE_PREFIX = "RNT";
const SEQUENCE_DIGITS = 3;

/**
 * Sinh mã đơn thuê dạng `RNT-YYMMDD-001` (ngày theo giờ Việt Nam).
 * Số thứ tự = số lớn nhất trong ngày + 1 (không dùng count, vì count sẽ sinh trùng
 * mã sau khi có đơn bị xóa mềm).
 *
 * Nếu hai người tạo đơn cùng một lúc, partial unique index trên `order_code` sẽ
 * chặn mã trùng và người tạo sau chỉ cần bấm tạo lại.
 */
export async function generateRentalOrderCode(
  db: Db,
  now: Date = new Date()
): Promise<string> {
  const prefix = `${RENTAL_CODE_PREFIX}-${vnDateStamp(now)}-`;

  const latest = await db.order.findFirst({
    where: { orderCode: { startsWith: prefix } },
    orderBy: { orderCode: "desc" },
    select: { orderCode: true },
  });

  const latestSequence = latest
    ? Number(latest.orderCode.slice(prefix.length))
    : 0;
  const nextSequence = String(latestSequence + 1).padStart(
    SEQUENCE_DIGITS,
    "0"
  );
  return `${prefix}${nextSequence}`;
}
