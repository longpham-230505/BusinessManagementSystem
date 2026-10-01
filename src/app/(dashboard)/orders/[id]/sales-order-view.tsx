import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, FlashMessages, type FlashSearchParams } from "@/components/flash-messages";
import { formatDateOnly } from "@/lib/datetime";
import { ORDER_STATUS_LABEL, ORDER_TYPE_LABEL } from "@/lib/labels";
import { formatVnd } from "@/lib/money";
import { findSalesOrderDetail, type SalesOrderDetail } from "@/server/queries/orders.queries";
import { sumConsumptionCost } from "@/server/services/fifo";
import { calculateOrderTotals, lineTotal, sumLineTotals } from "@/server/services/order-totals";
import { SALES_STATUSES } from "@/server/services/sales-order.service";
import { cancelSalesOrderAction, changeSalesOrderStatusAction } from "@/server/sales-order-actions";
import { EventForm, INLINE_INPUT_CLASS, InlineField } from "./event-form";

type Consumption = {
  quantity: number;
  unitCost: Prisma.Decimal;
  filmBatch: { receivedDate: Date };
};

/** Trang chi tiết đơn bán phim / in ảnh (được `page.tsx` gọi khi đơn không phải thuê máy). */
export async function SalesOrderView({ id, flash }: { id: string; flash: FlashSearchParams }) {
  const order = await findSalesOrderDetail(id);
  if (!order) notFound();

  const isCancelled = order.status === "CANCELLED";
  const consumptions = [
    ...order.filmSaleItems.flatMap((item) => item.consumptions),
    ...order.photoPrintItems.flatMap((item) => item.consumptions),
  ];

  return (
    <div className="max-w-5xl space-y-5">
      <Link href="/orders" className="text-sm text-accent underline">
        ← Đơn hàng
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{order.orderCode}</h1>
          <p className="text-sm text-ink/60">
            {ORDER_TYPE_LABEL[order.orderType]} · {order.customer.name} · {order.branch.name} ·{" "}
            <b>{ORDER_STATUS_LABEL[order.status]}</b>
          </p>
        </div>
        {!isCancelled && (
          <Link
            href={`/orders/${order.id}/edit`}
            className="rounded border border-line px-3 py-2 text-sm text-accent hover:bg-accent/10"
          >
            Sửa đơn
          </Link>
        )}
      </header>

      <FlashMessages notice={flash.notice} error={flash.error} />
      {isCancelled && <Alert tone="warning">Đơn đã hủy; phim đã được trả về kho.</Alert>}

      <ItemsCard order={order} />
      <TotalsCard order={order} consumptions={consumptions} />

      {!isCancelled && (
        <section className="space-y-4 rounded border border-line bg-white p-5">
          <h2 className="font-medium">Thao tác</h2>
          <StatusForm orderId={order.id} currentStatus={order.status} />
          <EventForm
            orderId={order.id}
            action={cancelSalesOrderAction}
            submitLabel="Hủy đơn (trả phim về kho)"
          />
        </section>
      )}
    </div>
  );
}

function StatusForm({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: SalesOrderDetail["status"];
}) {
  const otherStatuses = SALES_STATUSES.filter((status) => status !== currentStatus);

  return (
    <EventForm
      orderId={orderId}
      action={changeSalesOrderStatusAction}
      submitLabel="Cập nhật trạng thái"
    >
      <InlineField label="Chuyển sang">
        <select name="status" className={INLINE_INPUT_CLASS}>
          {otherStatuses.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </InlineField>
    </EventForm>
  );
}

function ItemsCard({ order }: { order: SalesOrderDetail }) {
  return (
    <section className="space-y-4 rounded border border-line bg-white p-5">
      <h2 className="font-medium">
        {order.orderType === "FILM_SALE" ? "Phim đã bán" : "Dịch vụ in"}
      </h2>

      {order.filmSaleItems.map((item) => (
        <ItemRow
          key={item.id}
          title={item.filmType.name}
          detail={`${item.quantity} × ${formatVnd(item.salePrice)}`}
          total={lineTotal(item.quantity, item.salePrice)}
          consumptions={item.consumptions}
        />
      ))}

      {order.photoPrintItems.map((item) => (
        <ItemRow
          key={item.id}
          title={item.printService.name}
          detail={`${item.quantity} ảnh × ${formatVnd(item.unitPrice)}`}
          total={lineTotal(item.quantity, item.unitPrice)}
          consumptions={item.consumptions}
          filmNote={item.filmType ? `Dùng ${item.filmQuantity} × ${item.filmType.name}` : undefined}
        />
      ))}
    </section>
  );
}

function ItemRow({
  title,
  detail,
  total,
  consumptions,
  filmNote,
}: {
  title: string;
  detail: string;
  total: Prisma.Decimal;
  consumptions: Consumption[];
  filmNote?: string;
}) {
  return (
    <div className="border-b border-line pb-3 text-sm last:border-b-0 last:pb-0">
      <div className="flex justify-between gap-3">
        <span>
          <b>{title}</b> · {detail}
        </span>
        <b>{formatVnd(total)}</b>
      </div>
      {filmNote && <p className="mt-1 text-ink/60">{filmNote}</p>}
      <CostBreakdown consumptions={consumptions} />
    </div>
  );
}

/** Giá vốn FIFO của một dòng, chia theo từng lô nhập đã bị trừ. */
function CostBreakdown({ consumptions }: { consumptions: Consumption[] }) {
  if (consumptions.length === 0) return null;

  const sorted = [...consumptions].sort(
    (a, b) => a.filmBatch.receivedDate.getTime() - b.filmBatch.receivedDate.getTime()
  );

  return (
    <p className="mt-1 text-xs text-ink/60">
      Giá vốn FIFO:{" "}
      {sorted
        .map(
          (c) =>
            `${c.quantity} × ${formatVnd(c.unitCost)} (lô ${formatDateOnly(c.filmBatch.receivedDate)})`
        )
        .join(" + ")}{" "}
      = <b>{formatVnd(sumConsumptionCost(consumptions))}</b>
    </p>
  );
}

function TotalsCard({
  order,
  consumptions,
}: {
  order: SalesOrderDetail;
  consumptions: Consumption[];
}) {
  const subtotal = sumLineTotals([
    ...order.filmSaleItems.map((i) => ({ quantity: i.quantity, unitPrice: i.salePrice })),
    ...order.photoPrintItems.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
  ]);
  const totals = calculateOrderTotals({
    subtotal,
    discountAmount: order.discountAmount,
    surchargeAmount: order.surchargeAmount,
    shippingFee: order.shippingFee,
  });
  const cost = sumConsumptionCost(consumptions);

  const rows: [string, string, boolean?][] = [
    ["Tổng tiền hàng", formatVnd(totals.subtotal)],
    ["Giảm giá", `− ${formatVnd(order.discountAmount)}`],
    ["Doanh thu đơn", formatVnd(totals.orderRevenue), true],
    ["Phí ship (không tính doanh thu)", formatVnd(order.shippingFee)],
    ["Khách cần trả", formatVnd(totals.amountDue), true],
    ["Giá vốn (FIFO)", formatVnd(cost)],
    ["Lãi gộp tạm tính", formatVnd(totals.orderRevenue.sub(cost)), true],
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
