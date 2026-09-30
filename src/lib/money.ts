/** Định dạng số tiền VND để hiển thị, ví dụ `650.000 ₫`. Nhận Prisma.Decimal, number hoặc string. */
export function formatVnd(value: { toString(): string } | number): string {
  return `${Number(value.toString()).toLocaleString("vi-VN")} ₫`;
}
