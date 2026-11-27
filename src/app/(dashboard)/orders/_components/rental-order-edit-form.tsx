import { CustomerSelectField } from "@/components/customer-select-field";
import { SelectField, SubmitButton } from "@/components/form-fields";
import { OrderAdjustmentFields } from "@/components/order-adjustment-fields";
import { toVnDateTimeLocal } from "@/lib/datetime";
import type { RentalEditPermissions } from "@/server/services/rental-edit-rules";
import type {
  RentalOrderDetail,
  loadNewRentalOrderOptions,
} from "@/server/queries/rental-orders.queries";
import { CameraPicker } from "./camera-picker";
import { RentalScheduleFields } from "./rental-schedule-fields";

type Options = Awaited<ReturnType<typeof loadNewRentalOrderOptions>>;

/**
 * Form sửa đơn thuê. Phần bị khóa theo trạng thái đơn được hiển thị dạng chữ kèm
 * input ẩn giữ nguyên giá trị hiện tại (không dùng `disabled` vì input bị disabled
 * không được gửi đi, server sẽ hiểu nhầm là đã bị xóa).
 */
export function RentalOrderEditForm({
  order,
  options,
  permissions,
  action,
}: {
  order: RentalOrderDetail;
  options: Options;
  permissions: RentalEditPermissions;
  action: (formData: FormData) => Promise<void>;
}) {
  const detail = order.rentalDetail;
  if (!detail) return null;

  const currentCameras = order.rentalItems.map((item) => item.cameraInstance);
  const selectedIds = currentCameras.map((camera) => camera.id);
  // Máy đang có trong đơn luôn hiện trong danh sách, kể cả khi đã ngừng sử dụng.
  const pickableCameras = [
    ...currentCameras,
    ...options.cameras.filter((camera) => !selectedIds.includes(camera.id)),
  ];

  return (
    <form
      action={action}
      className="space-y-6 rounded-lg border border-line bg-white p-5 shadow-sm"
    >
      <input type="hidden" name="orderId" value={order.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <CustomerSelectField customers={options.customers} defaultValue={order.customerId} />

        <SelectField name="branchId" label="Cơ sở giao máy" required defaultValue={order.branchId}>
          {options.branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </SelectField>

        <RentalScheduleFields
          defaultPickupAt={toVnDateTimeLocal(detail.pickupAt)}
          defaultReturnDueAt={toVnDateTimeLocal(detail.returnDueAt)}
          defaultRentalDays={detail.rentalDays}
          pickupLocked={!permissions.canChangePickup}
          returnLocked={!permissions.canChangeReturnDue}
        />
        <OrderAdjustmentFields
          defaults={{
            discountAmount: order.discountAmount.toString(),
            surchargeAmount: order.surchargeAmount.toString(),
            surchargeNote: order.surchargeNote ?? "",
            shippingFee: order.shippingFee.toString(),
          }}
        />
      </div>

      {permissions.canChangeCameras ? (
        <CameraPicker cameras={pickableCameras} selectedIds={selectedIds} />
      ) : (
        <div className="text-sm">
          <span className="mb-1 block text-ink/70">Máy thuê (đã khóa)</span>
          <b>{currentCameras.map((camera) => camera.assetCode).join(", ")}</b>
          {selectedIds.map((id) => (
            <input key={id} type="hidden" name="cameraIds" value={id} />
          ))}
        </div>
      )}

      <fieldset className="space-y-2 text-sm">
        <legend className="mb-1 text-ink/70">
          Chi phí khác theo máy (hư hỏng, vệ sinh... — cộng vào doanh thu đơn)
        </legend>
        {order.rentalItems.map((item) => (
          <div key={item.id} className="grid gap-2 sm:grid-cols-[8rem_10rem_1fr] sm:items-center">
            <b>{item.cameraInstance.assetCode}</b>
            <input type="hidden" name="otherCostCameraId" value={item.cameraInstanceId} />
            <input
              name="otherCost"
              type="number"
              min={0}
              defaultValue={item.otherCost.toString()}
              className="w-full rounded border border-line px-3 py-2"
            />
            <input
              name="otherCostNote"
              placeholder="Lý do"
              defaultValue={item.otherCostNote ?? ""}
              className="w-full rounded border border-line px-3 py-2"
            />
          </div>
        ))}
      </fieldset>

      <label className="block text-sm">
        <span className="mb-1 block text-ink/70">Ghi chú</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={order.notes ?? ""}
          className="w-full rounded border border-line px-3 py-2"
        />
      </label>

      <SubmitButton>Lưu thay đổi</SubmitButton>
    </form>
  );
}

