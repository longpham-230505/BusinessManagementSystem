import { Prisma } from "@prisma/client";
import { BackLink } from "@/components/back-link";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Alert,
  FlashMessages,
  type FlashSearchParams,
} from "@/components/flash-messages";
import { formatVnDateTime } from "@/lib/datetime";
import { ORDER_STATUS_LABEL } from "@/lib/labels";
import { formatVnd } from "@/lib/money";
import { calculateOverdueDays } from "@/lib/rental-days";
import { listBranches } from "@/server/queries/master-data.queries";
import {
  findRentalOrderDetail,
  type RentalOrderDetail,
} from "@/server/queries/rental-orders.queries";
import { sumRentalSubtotal } from "@/server/services/order-totals";
import { sumRentalFees } from "@/server/services/rental-pricing";
import { LifecyclePanel } from "./lifecycle-panel";
import { OrderTotalsCard } from "./order-totals-card";

/** Chỉ trước khi giao máy thì vị trí máy mới cần khớp với cơ sở giao. */
const PRE_PICKUP_STATUSES = ["PENDING_BOOKING_DEPOSIT", "BOOKED"];

/** Trang chi tiết đơn thuê máy (được `page.tsx` gọi khi đơn có loại RENTAL). */
export async function RentalOrderView({
  id,
  flash,
}: {
  id: string;
  flash: FlashSearchParams;
}) {
  const [order, branches] = await Promise.all([
    findRentalOrderDetail(id),
    listBranches(),
  ]);
  if (!order?.rentalDetail) notFound();

  const maintenanceCodes = findAssetCodes(
    order,
    (item) => item.cameraInstance.status === "MAINTENANCE"
  );
  const transferCodes = PRE_PICKUP_STATUSES.includes(order.status)
    ? findAssetCodes(
        order,
        (item) => item.cameraInstance.branchId !== order.branchId
      )
    : [];

  const overdueDays = findOverdueDays(order);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <BackLink href="/orders" label="Đơn hàng" />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium">{order.orderCode}</h1>
          <p className="text-sm text-ink/60">
            {order.customer.name} · {order.branch.name} ·{" "}
            <b>{ORDER_STATUS_LABEL[order.status]}</b>
          </p>
        </div>
        {order.status !== "CANCELLED" && (
          <Link
            href={`/orders/${order.id}/edit`}
            className="rounded border border-line px-3 py-2 text-sm text-accent hover:bg-accent/10"
          >
            Sửa đơn
          </Link>
        )}
      </header>

      <FlashMessages notice={flash.notice} error={flash.error} />
      {maintenanceCodes.length > 0 && (
        <Alert tone="warning">
          Cảnh báo: {maintenanceCodes.join(", ")} đang ở trạng thái bảo trì.
        </Alert>
      )}
      {overdueDays > 0 && (
        <Alert tone="warning">
          {order.status === "RENTING"
            ? `Đơn đang trễ hạn trả ${overdueDays} ngày.`
            : `Máy được trả trễ ${overdueDays} ngày.`}{" "}
          Nếu thu phí trễ hạn, hãy ghi vào Phụ thu (kèm lý do) khi sửa đơn.
        </Alert>
      )}
      {transferCodes.length > 0 && (
        <Alert tone="warning">
          Camera Transfer Required: {transferCodes.join(", ")} đang không ở cơ
          sở giao máy.
        </Alert>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <ScheduleCard order={order} />
        <CamerasCard order={order} />
      </div>

      <OrderTotalsCard
        subtotal={sumRentalSubtotal(order.rentalItems)}
        order={order}
        leadingRows={[["Tiền thuê máy", formatVnd(sumRentalFees(order.rentalItems))]]}
        trailingRows={[
          ["Chi phí khác (đã gồm trong tiền hàng)", formatVnd(sumOtherCosts(order))],
        ]}
      />

      <LifecyclePanel order={order} branches={branches} />
    </div>
  );
}

/** Số ngày trễ: so với "bây giờ" nếu máy còn đang thuê, so với lúc trả nếu đã trả máy. */
function findOverdueDays(order: RentalOrderDetail): number {
  const detail = order.rentalDetail;
  if (!detail || order.status === "CANCELLED") return 0;
  if (order.status === "RENTING") return calculateOverdueDays(detail.returnDueAt, new Date());
  return detail.returnedAt ? calculateOverdueDays(detail.returnDueAt, detail.returnedAt) : 0;
}

function sumOtherCosts(order: RentalOrderDetail) {
  return order.rentalItems.reduce(
    (total, item) => total.add(item.otherCost),
    new Prisma.Decimal(0)
  );
}

function findAssetCodes(
  order: RentalOrderDetail,
  predicate: (item: RentalOrderDetail["rentalItems"][number]) => boolean
): string[] {
  return order.rentalItems
    .filter(predicate)
    .map((item) => item.cameraInstance.assetCode);
}

function ScheduleCard({ order }: { order: RentalOrderDetail }) {
  const { rentalDetail } = order;
  if (!rentalDetail) return null;

  return (
    <section className="rounded border border-line bg-white p-5">
      <h2 className="font-medium">Lịch thuê</h2>
      <p className="mt-2 text-sm">
        {rentalDetail.rentalDays} ngày · Nhận{" "}
        {formatVnDateTime(rentalDetail.pickupAt)} · Hạn trả{" "}
        {formatVnDateTime(rentalDetail.returnDueAt)}
      </p>
      <p className="mt-1 text-sm">
        Tổng tiền thuê: <b>{formatVnd(sumRentalFees(order.rentalItems))}</b>
      </p>
    </section>
  );
}

function CamerasCard({ order }: { order: RentalOrderDetail }) {
  return (
    <section className="rounded border border-line bg-white p-5">
      <h2 className="font-medium">Máy thuê</h2>
      {order.rentalItems.map((item) => (
        <p key={item.id} className="mt-2 text-sm">
          <b>{item.cameraInstance.assetCode}</b> ·{" "}
          {item.cameraInstance.cameraModel.name}: {item.combo3Count} combo +{" "}
          {item.singleDayCount} ngày = {formatVnd(item.rentalFee)}
        </p>
      ))}
    </section>
  );
}
