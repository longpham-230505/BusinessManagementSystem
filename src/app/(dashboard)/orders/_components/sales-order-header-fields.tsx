import { CustomerSelectField } from "@/components/customer-select-field";
import { Field, SelectField } from "@/components/form-fields";
import {
  OrderAdjustmentFields,
  type OrderAdjustmentValues,
} from "@/components/order-adjustment-fields";

type Option = { id: string; name: string; phone?: string | null };

export type SalesOrderHeaderValues = OrderAdjustmentValues & {
  customerId: string;
  branchId: string;
  serviceAt: string;
  notes: string;
};

/**
 * Các trường chung của đơn bán phim và đơn in ảnh: khách, cơ sở, ngày giờ giao/nhận,
 * giảm giá, phụ thu, phí ship, ghi chú.
 */
export function SalesOrderHeaderFields({
  customers,
  branches,
  serviceAtLabel,
  defaults,
}: {
  customers: Option[];
  branches: Option[];
  /** Nhãn của ô ngày giờ phục vụ, ví dụ "Ngày giờ giao / nhận phim". */
  serviceAtLabel: string;
  defaults?: SalesOrderHeaderValues;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <CustomerSelectField customers={customers} defaultValue={defaults?.customerId} />

        <SelectField
          name="branchId"
          label="Cơ sở phụ trách"
          required
          defaultValue={defaults?.branchId}
        >
          <option value="">Chọn cơ sở</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </SelectField>

        <Field
          name="serviceAt"
          label={serviceAtLabel}
          type="datetime-local"
          required
          defaultValue={defaults?.serviceAt}
        />
        <OrderAdjustmentFields defaults={defaults} />
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-ink/70">Ghi chú</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={defaults?.notes}
          className="w-full rounded border border-line px-3 py-2"
        />
      </label>
    </>
  );
}
