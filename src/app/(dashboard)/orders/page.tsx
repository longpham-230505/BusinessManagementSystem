import Link from "next/link";
import { TABLE_WRAPPER_CLASS } from "@/components/form-fields";
import { formatVnDateTime } from "@/lib/datetime";
import { ORDER_STATUS_LABEL } from "@/lib/labels";
import { listRentalOrders } from "@/server/queries/rental-orders.queries";

export default async function OrdersPage() {
  const orders = await listRentalOrders();

  return (
    <div className="max-w-6xl space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Đơn thuê máy</h1>
          <p className="text-sm text-ink/60">
            Theo dõi lịch đặt, giao và trả máy.
          </p>
        </div>
        <Link
          href="/orders/new"
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-paper"
        >
          Tạo đơn thuê
        </Link>
      </header>

      <div className={TABLE_WRAPPER_CLASS}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-ink/5">
            <tr>
              <th className="p-3">Mã đơn</th>
              <th className="p-3">Khách / Cơ sở</th>
              <th className="p-3">Lịch thuê</th>
              <th className="p-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-line">
                <td className="p-3 font-medium">
                  <Link
                    className="text-accent underline"
                    href={`/orders/${order.id}`}
                  >
                    {order.orderCode}
                  </Link>
                  <br />
                  <span className="text-ink/55">
                    {order.rentalItems
                      .map((item) => item.cameraInstance.assetCode)
                      .join(", ")}
                  </span>
                </td>
                <td className="p-3">
                  {order.customer.name}
                  <br />
                  <span className="text-ink/55">{order.branch.name}</span>
                </td>
                <td className="p-3">
                  {order.rentalDetail && (
                    <>
                      {order.rentalDetail.rentalDays} ngày
                      <br />
                      <span className="text-ink/55">
                        Nhận {formatVnDateTime(order.rentalDetail.pickupAt)}
                      </span>
                    </>
                  )}
                </td>
                <td className="p-3">{ORDER_STATUS_LABEL[order.status]}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={4} className="p-5 text-ink/50">
                  Chưa có đơn thuê.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
