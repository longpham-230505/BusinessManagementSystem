import Link from "next/link";
import { FlashMessages, type FlashSearchParams } from "@/components/flash-messages";
import { loadSalesOrderFormOptions } from "@/server/queries/orders.queries";
import { createFilmSaleOrderAction } from "@/server/sales-order-actions";
import { FilmSaleOrderForm } from "../../_components/film-sale-order-form";

export default async function NewFilmSaleOrderPage({
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
        <h1 className="mt-2 text-2xl font-semibold">Tạo đơn bán phim</h1>
        <p className="mt-1 text-sm text-ink/60">
          Phim được giữ trong kho ngay khi tạo đơn và trừ theo thứ tự lô nhập (FIFO).
        </p>
      </header>

      <FlashMessages error={flash.error} />
      <FilmSaleOrderForm
        options={options}
        action={createFilmSaleOrderAction}
        submitLabel="Tạo đơn bán phim"
      />
    </div>
  );
}
