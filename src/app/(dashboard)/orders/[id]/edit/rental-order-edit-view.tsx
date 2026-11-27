import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, FlashMessages, type FlashSearchParams } from "@/components/flash-messages";
import { ORDER_STATUS_LABEL } from "@/lib/labels";
import {
  findRentalOrderDetail,
  loadNewRentalOrderOptions,
} from "@/server/queries/rental-orders.queries";
import { updateRentalOrderAction } from "@/server/rental-actions";
import { getRentalEditPermissions } from "@/server/services/rental-edit-rules";
import { RentalOrderEditForm } from "../../_components/rental-order-edit-form";

/** Sửa đơn thuê máy. Phần nào sửa được tùy trạng thái đơn. */
export async function RentalOrderEditView({ id, flash }: { id: string; flash: FlashSearchParams }) {
  const [order, options] = await Promise.all([
    findRentalOrderDetail(id),
    loadNewRentalOrderOptions(),
  ]);
  if (!order) notFound();

  const permissions = getRentalEditPermissions(order.status);

  return (
    <div className="max-w-4xl space-y-5">
      <header>
        <Link href={`/orders/${id}`} className="text-sm text-accent underline">
          ← {order.orderCode}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Sửa đơn {order.orderCode}</h1>
        <p className="mt-1 text-sm text-ink/60">
          Trạng thái hiện tại: <b>{ORDER_STATUS_LABEL[order.status]}</b>.{" "}
          {describeEditableParts(permissions)} Khi đổi lịch hoặc máy, hệ thống kiểm tra lại trùng
          lịch và tính lại tiền thuê (máy giữ nguyên dùng giá đã lưu lúc tạo đơn).
        </p>
      </header>

      <FlashMessages error={flash.error} />

      {permissions ? (
        <RentalOrderEditForm
          order={order}
          options={options}
          permissions={permissions}
          action={updateRentalOrderAction}
        />
      ) : (
        <Alert tone="warning">Đơn đã hủy nên không thể sửa.</Alert>
      )}
    </div>
  );
}

function describeEditableParts(permissions: ReturnType<typeof getRentalEditPermissions>): string {
  if (!permissions) return "";
  if (permissions.canChangeCameras) return "Có thể sửa mọi thông tin của đơn.";
  if (permissions.canChangeReturnDue) {
    return "Máy đã giao nên chỉ sửa được hạn trả (gia hạn), khách, cơ sở và ghi chú.";
  }
  return "Máy đã trả nên chỉ sửa được khách, cơ sở và ghi chú.";
}
