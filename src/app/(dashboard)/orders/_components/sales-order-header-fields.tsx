import { Field, SelectField } from "@/components/form-fields";

type Option = { id: string; name: string; phone?: string | null };

export type SalesOrderHeaderValues = {
  customerId: string;
  branchId: string;
  shippingFee: string;
  discountAmount: string;
  notes: string;
};

/** Các trường chung của đơn bán phim và đơn in ảnh: khách, cơ sở, phí ship, giảm giá, ghi chú. */
export function SalesOrderHeaderFields({
  customers,
  branches,
  defaults,
}: {
  customers: Option[];
  branches: Option[];
  defaults?: SalesOrderHeaderValues;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="customerId"
          label="Khách hàng"
          required
          defaultValue={defaults?.customerId}
        >
          <option value="">Chọn khách</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
              {customer.phone ? ` — ${customer.phone}` : ""}
            </option>
          ))}
        </SelectField>

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
          name="discountAmount"
          label="Giảm giá (số tiền cố định)"
          type="number"
          defaultValue={defaults?.discountAmount ?? "0"}
        />
        <Field
          name="shippingFee"
          label="Phí ship (chỉ ghi nhận, không tính doanh thu)"
          type="number"
          defaultValue={defaults?.shippingFee ?? "0"}
        />
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
