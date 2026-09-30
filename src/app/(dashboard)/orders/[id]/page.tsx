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
import { listBranches } from "@/server/queries/master-data.queries";
import {
  findRentalOrderDetail,
  type RentalOrderDetail,
} from "@/server/queries/rental-orders.queries";
import { sumRentalFees } from "@/server/services/rental-pricing";
import { LifecyclePanel } from "./lifecycle-panel";

/** Chỉ trước khi giao máy thì vị trí máy mới cần khớp với cơ sở giao. */
const PRE_PICKUP_STATUSES = ["PENDING_BOOKING_DEPOSIT", "BOOKED"];

export default async function RentalOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<FlashSearchParams>;
}) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
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

  return (
    <div className="max-w-5xl space-y-5">
      <Link href="/orders" className="text-sm text-accent underline">
        ← Đơn thuê
      </Link>

      <header>
        <h1 className="text-2xl font-semibold">{order.orderCode}</h1>
        <p className="text-sm text-ink/60">
          {order.customer.name} · {order.branch.name} ·{" "}
          <b>{ORDER_STATUS_LABEL[order.status]}</b>
        </p>
      </header>

      <FlashMessages notice={flash.notice} error={flash.error} />
      {maintenanceCodes.length > 0 && (
        <Alert tone="warning">
          Cảnh báo: {maintenanceCodes.join(", ")} đang ở trạng thái bảo trì.
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

      <LifecyclePanel order={order} branches={branches} />
    </div>
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
