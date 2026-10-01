import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerFields } from "@/components/customer-fields";
import { FlashMessages, type FlashSearchParams } from "@/components/flash-messages";
import { SubmitButton } from "@/components/form-fields";
import { saveMasterData } from "@/server/master-data";
import { findCustomer } from "@/server/queries/master-data.queries";

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<FlashSearchParams>;
}) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  const customer = await findCustomer(id);
  if (!customer) notFound();

  return (
    <div className="max-w-4xl space-y-5">
      <header>
        <Link href="/customers" className="text-sm text-accent underline">
          ← Khách hàng
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Sửa khách hàng {customer.name}</h1>
      </header>

      <FlashMessages error={flash.error} />

      <form
        action={saveMasterData}
        className="grid gap-3 rounded-lg border border-line bg-white p-5 shadow-sm md:grid-cols-2"
      >
        <input type="hidden" name="entity" value="customer" />
        <input type="hidden" name="id" value={customer.id} />

        <CustomerFields customer={customer} />

        <SubmitButton className="md:col-span-2">Lưu thay đổi</SubmitButton>
      </form>
    </div>
  );
}
