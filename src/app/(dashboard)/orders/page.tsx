import { OrderType } from "@prisma/client";
import Link from "next/link";
import { TABLE_WRAPPER_CLASS } from "@/components/form-fields";
import { formatVnDateTime } from "@/lib/datetime";
import { ORDER_STATUS_LABEL, ORDER_TYPE_LABEL } from "@/lib/labels";
import { formatVnd } from "@/lib/money";
import { listOrders, type OrderListItem } from "@/server/queries/orders.queries";
import {
  calculateOrderTotals,
  sumLineTotals,
} from "@/server/services/order-totals";

const ORDER_TYPES = Object.values(OrderType);

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const selectedType = ORDER_TYPES.find((candidate) => candidate === type);
  const orders = await listOrders(selectedType);

  return (
    <div className="max-w-6xl space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Đơn hàng</h1>
          <p className="text-sm text-ink/60">
            Thuê máy, bán phim và in ảnh.
          </p>
        </div>
        <Link
          href="/orders/new"
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-paper"
        >
          Tạo đơn
        </Link>
      </header>

      <TypeFilter selected={selectedType} />

      <div className={TABLE_WRAPPER_CLASS}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-ink/5">
            <tr>
              <th className="p-3">Mã đơn</th>
              <th className="p-3">Khách / Cơ sở</th>
              <th className="p-3">Nội dung</th>
              <th className="p-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-line">
                <td className="p-3 font-medium">
                  <Link className="text-accent underline" href={`/orders/${order.id}`}>
                    {order.orderCode}
                  </Link>
                  <br />
                  <span className="text-ink/55">{ORDER_TYPE_LABEL[order.orderType]}</span>
                </td>
                <td className="p-3">
                  {order.customer.name}
                  <br />
                  <span className="text-ink/55">{order.branch.name}</span>
                </td>
                <td className="p-3">
                  <OrderSummary order={order} />
                </td>
                <td className="p-3">{ORDER_STATUS_LABEL[order.status]}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={4} className="p-5 text-ink/50">
                  Chưa có đơn hàng.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TypeFilter({ selected }: { selected?: OrderType }) {
  const tabs: { label: string; href: string; active: boolean }[] = [
    { label: "Tất cả", href: "/orders", active: !selected },
    ...ORDER_TYPES.map((type) => ({
      label: ORDER_TYPE_LABEL[type],
      href: `/orders?type=${type}`,
      active: selected === type,
    })),
  ];

  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-full border px-3 py-1 text-sm ${
            tab.active
              ? "border-accent bg-accent/10 text-accent"
              : "border-line text-ink/70 hover:bg-ink/5"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/** Tóm tắt nội dung đơn theo từng loại. */
function OrderSummary({ order }: { order: OrderListItem }) {
  switch (order.orderType) {
    case "RENTAL":
      return (
        <>
          {order.rentalItems.map((item) => item.cameraInstance.assetCode).join(", ")}
          {order.rentalDetail && (
            <>
              <br />
              <span className="text-ink/55">
                {order.rentalDetail.rentalDays} ngày · nhận{" "}
                {formatVnDateTime(order.rentalDetail.pickupAt)}
              </span>
            </>
          )}
        </>
      );

    case "FILM_SALE":
      return (
        <SalesSummary
          order={order}
          names={order.filmSaleItems.map((item) => `${item.quantity} × ${item.filmType.name}`)}
          lines={order.filmSaleItems.map((item) => ({
            quantity: item.quantity,
            unitPrice: item.salePrice,
          }))}
        />
      );

    case "PHOTO_PRINT":
      return (
        <SalesSummary
          order={order}
          names={order.photoPrintItems.map(
            (item) => `${item.quantity} × ${item.printService.name}`
          )}
          lines={order.photoPrintItems.map((item) => ({
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }))}
        />
      );
  }
}

function SalesSummary({
  order,
  names,
  lines,
}: {
  order: OrderListItem;
  names: string[];
  lines: Parameters<typeof sumLineTotals>[0];
}) {
  const { orderRevenue } = calculateOrderTotals({
    subtotal: sumLineTotals(lines),
    discountAmount: order.discountAmount,
    surchargeAmount: order.surchargeAmount,
    shippingFee: order.shippingFee,
  });

  return (
    <>
      {names.join(", ")}
      <br />
      <span className="text-ink/55">Doanh thu đơn {formatVnd(orderRevenue)}</span>
    </>
  );
}
