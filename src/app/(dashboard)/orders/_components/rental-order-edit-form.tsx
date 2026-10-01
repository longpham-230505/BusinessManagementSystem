import { Field, SelectField, SubmitButton } from "@/components/form-fields";
import { formatVnDateTime, toVnDateTimeLocal } from "@/lib/datetime";
import type { RentalEditPermissions } from "@/server/services/rental-edit-rules";
import type {
  RentalOrderDetail,
  loadNewRentalOrderOptions,
} from "@/server/queries/rental-orders.queries";
import { CameraPicker } from "./camera-picker";

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
        <SelectField name="customerId" label="Khách hàng" required defaultValue={order.customerId}>
          {options.customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
              {customer.phone ? ` — ${customer.phone}` : ""}
            </option>
          ))}
        </SelectField>

        <SelectField name="branchId" label="Cơ sở giao máy" required defaultValue={order.branchId}>
          {options.branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </SelectField>

        {permissions.canChangePickup ? (
          <Field
            name="pickupAt"
            label="Nhận máy"
            type="datetime-local"
            required
            defaultValue={toVnDateTimeLocal(detail.pickupAt)}
          />
        ) : (
          <LockedValue
            name="pickupAt"
            label="Nhận máy"
            value={toVnDateTimeLocal(detail.pickupAt)}
            display={formatVnDateTime(detail.pickupAt)}
          />
        )}

        {permissions.canChangeReturnDue ? (
          <Field
            name="returnDueAt"
            label="Hạn trả máy"
            type="datetime-local"
            required
            defaultValue={toVnDateTimeLocal(detail.returnDueAt)}
          />
        ) : (
          <LockedValue
            name="returnDueAt"
            label="Hạn trả máy"
            value={toVnDateTimeLocal(detail.returnDueAt)}
            display={formatVnDateTime(detail.returnDueAt)}
          />
        )}
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

function LockedValue({
  name,
  label,
  value,
  display,
}: {
  name: string;
  label: string;
  value: string;
  display: string;
}) {
  return (
    <div className="text-sm">
      <span className="mb-1 block text-ink/70">{label} (đã khóa)</span>
      <b>{display}</b>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
