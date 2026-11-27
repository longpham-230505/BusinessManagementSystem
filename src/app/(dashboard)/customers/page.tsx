import {
  FlashMessages,
  type FlashSearchParams,
} from "@/components/flash-messages";
import { CustomerFields } from "@/components/customer-fields";
import { FormDialog } from "@/components/form-dialog";
import { RowActions, TABLE_WRAPPER_CLASS } from "@/components/form-fields";
import { createCustomerFromDialogAction } from "@/server/dialog-actions";
import { listCustomers } from "@/server/queries/master-data.queries";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<FlashSearchParams>;
}) {
  const [customers, flash] = await Promise.all([listCustomers(), searchParams]);

  return (
    <div className="max-w-6xl space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Khách hàng</h1>
          <p className="mt-1 text-sm text-ink/60">
            Số điện thoại không bắt buộc là duy nhất; cần kiểm tra khách trùng trước khi tạo
            đơn.
          </p>
        </div>
        <FormDialog
          triggerLabel="Thêm khách hàng"
          title="Thêm khách hàng mới"
          submitLabel="Thêm khách hàng"
          action={createCustomerFromDialogAction}
          widthClass="max-w-2xl"
        >
          <CustomerFields />
        </FormDialog>
      </header>

      <FlashMessages {...flash} />

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
                  <RowActions
                    editHref={`/customers/${customer.id}/edit`}
                    entity="customer"
                    id={customer.id}
                  />
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
