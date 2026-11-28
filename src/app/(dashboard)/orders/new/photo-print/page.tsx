import { BackLink } from "@/components/back-link";
import { FlashMessages, type FlashSearchParams } from "@/components/flash-messages";
import { loadSalesOrderFormOptions } from "@/server/queries/orders.queries";
import { createPhotoPrintOrderAction } from "@/server/sales-order-actions";
import { PhotoPrintOrderForm } from "../../_components/photo-print-order-form";

export default async function NewPhotoPrintOrderPage({
  searchParams,
}: {
  searchParams: Promise<FlashSearchParams>;
}) {
  const [options, flash] = await Promise.all([loadSalesOrderFormOptions(), searchParams]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <BackLink href="/orders/new" label="Chọn loại đơn" />
        <h1 className="mt-2 text-2xl font-medium">Tạo đơn in ảnh</h1>
      </header>

      <FlashMessages error={flash.error} />
      <PhotoPrintOrderForm
        options={options}
        action={createPhotoPrintOrderAction}
        submitLabel="Tạo đơn in ảnh"
      />
    </div>
  );
}
