import Link from "next/link";
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
    <div className="max-w-4xl space-y-5">
      <header>
        <Link href="/orders/new" className="text-sm text-accent underline">
          ← Chọn loại đơn
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Tạo đơn in ảnh</h1>
        <p className="mt-1 text-sm text-ink/60">
          Dòng in có dùng phim của cửa hàng sẽ trừ kho phim theo FIFO.
        </p>
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
