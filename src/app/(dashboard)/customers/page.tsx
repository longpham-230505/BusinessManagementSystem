import {
  FlashMessages,
  type FlashSearchParams,
} from "@/components/flash-messages";
import {
  CheckboxField,
  Field,
  SoftDeleteForm,
  SubmitButton,
  TABLE_WRAPPER_CLASS,
} from "@/components/form-fields";
import { saveMasterData } from "@/server/master-data";
import { listCustomers } from "@/server/queries/master-data.queries";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<FlashSearchParams>;
}) {
  const [customers, flash] = await Promise.all([listCustomers(), searchParams]);

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Khách hàng</h1>
        <p className="mt-1 text-sm text-ink/60">
          Số điện thoại không bắt buộc là duy nhất; cần kiểm tra khách trùng
          trước khi tạo đơn.
        </p>
      </header>

      <FlashMessages {...flash} />

      <form
        action={saveMasterData}
        className="grid gap-3 rounded-lg border border-line bg-white p-5 shadow-sm md:grid-cols-2"
      >
        <input type="hidden" name="entity" value="customer" />

        <Field name="name" label="Tên khách hàng" required />
        <Field name="phone" label="Số điện thoại" />
        <Field
          name="contactChannel"
          label="Kênh liên hệ"
          placeholder="Facebook, Zalo…"
        />
        <Field name="contactHandle" label="Tài khoản liên hệ" />
        <Field name="notes" label="Ghi chú" />
        <div className="flex items-end pb-2">
          <CheckboxField name="isFlagged" label="Khách cần lưu ý" />
        </div>

        <SubmitButton className="md:col-span-2">Thêm khách hàng</SubmitButton>
      </form>

      <div className={TABLE_WRAPPER_CLASS}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-ink/5">
            <tr>
              <th className="p-3">Khách hàng</th>
              <th className="p-3">Liên hệ</th>
              <th className="p-3">Ghi chú</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-line">
                <td className="p-3 font-medium">
                  {customer.name}
                  {customer.isFlagged && (
                    <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                      Lưu ý
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {customer.phone ?? "—"}
                  <br />
                  <span className="text-ink/55">
                    {[customer.contactChannel, customer.contactHandle]
                      .filter(Boolean)
                      .join(": ")}
                  </span>
                </td>
                <td className="p-3">{customer.notes ?? "—"}</td>
                <td className="p-3">
                  <SoftDeleteForm entity="customer" id={customer.id} />
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={4} className="p-5 text-ink/50">
                  Chưa có khách hàng.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
