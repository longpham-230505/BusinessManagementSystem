import Link from "next/link";
import { Field, SelectField, SubmitButton } from "@/components/form-fields";
import {
  FlashMessages,
  type FlashSearchParams,
} from "@/components/flash-messages";
import { createRentalOrderAction } from "@/server/rental-actions";
import { loadNewRentalOrderOptions } from "@/server/queries/rental-orders.queries";
import { CameraPicker } from "../../_components/camera-picker";

export default async function NewRentalOrderPage({
  searchParams,
}: {
  searchParams: Promise<FlashSearchParams>;
}) {
  const [{ customers, branches, cameras }, flash] = await Promise.all([
    loadNewRentalOrderOptions(),
    searchParams,
  ]);

  return (
    <div className="max-w-4xl space-y-5">
      <header>
        <Link href="/orders" className="text-sm text-accent underline">
          ← Đơn hàng
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Tạo đơn thuê</h1>
      </header>

      <FlashMessages error={flash.error} />

      <form
        action={createRentalOrderAction}
        className="space-y-6 rounded-lg border border-line bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField name="customerId" label="Khách hàng" required>
            <option value="">Chọn khách</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
                {customer.phone ? ` — ${customer.phone}` : ""}
              </option>
            ))}
          </SelectField>

          <SelectField name="branchId" label="Cơ sở giao máy" required>
            <option value="">Chọn cơ sở</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </SelectField>

          <Field
            name="pickupAt"
            label="Nhận máy"
            type="datetime-local"
            required
          />
          <Field
            name="returnDueAt"
            label="Hạn trả máy"
            type="datetime-local"
            required
          />
        </div>

        <CameraPicker cameras={cameras} />

        <label className="block text-sm">
          <span className="mb-1 block text-ink/70">Ghi chú</span>
          <textarea
            name="notes"
            rows={3}
            className="w-full rounded border border-line px-3 py-2"
          />
        </label>

        <SubmitButton>Tạo đơn và tính giá</SubmitButton>
      </form>
    </div>
  );
}
