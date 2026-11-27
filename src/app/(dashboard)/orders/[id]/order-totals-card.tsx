import type { Prisma } from "@prisma/client";
import { formatVnd } from "@/lib/money";
import { calculateOrderTotals } from "@/server/services/order-totals";

export type TotalsRow = [label: string, value: string, strong?: boolean];

/**
 * Thẻ "Tổng kết" dùng chung cho mọi loại đơn. Công thức xem `order-totals.ts`:
 * doanh thu = tiền hàng − giảm giá + phụ thu; khách cần trả = doanh thu + phí ship.
 * `leadingRows` là các dòng riêng của từng loại đơn, đặt trước dòng tiền hàng;
 * `trailingRows` đặt sau dòng "Khách cần trả" (giá vốn, đã thu...).
 */
export function OrderTotalsCard({
  subtotal,
  order,
  leadingRows = [],
  trailingRows = [],
}: {
  subtotal: Prisma.Decimal;
  order: {
    discountAmount: Prisma.Decimal;
    surchargeAmount: Prisma.Decimal;
    surchargeNote: string | null;
    shippingFee: Prisma.Decimal;
  };
  leadingRows?: TotalsRow[];
  trailingRows?: TotalsRow[];
}) {
  const totals = calculateOrderTotals({
    subtotal,
    discountAmount: order.discountAmount,
    surchargeAmount: order.surchargeAmount,
    shippingFee: order.shippingFee,
  });

  const surchargeLabel = order.surchargeNote ? `Phụ thu (${order.surchargeNote})` : "Phụ thu";
  const rows: TotalsRow[] = [
    ...leadingRows,
    ["Tổng tiền hàng", formatVnd(totals.subtotal)],
    ["Giảm giá", `− ${formatVnd(order.discountAmount)}`],
    [surchargeLabel, `+ ${formatVnd(order.surchargeAmount)}`],
    ["Doanh thu đơn", formatVnd(totals.orderRevenue), true],
    ["Phí ship (không tính doanh thu)", formatVnd(order.shippingFee)],
    ["Khách cần trả", formatVnd(totals.amountDue), true],
    ...trailingRows,
  ];

  return (
    <section className="rounded border border-line bg-white p-5">
      <h2 className="mb-3 font-medium">Tổng kết</h2>
      <dl className="space-y-1 text-sm">
        {rows.map(([label, value, strong]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-ink/70">{label}</dt>
            <dd className={strong ? "font-semibold" : ""}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
