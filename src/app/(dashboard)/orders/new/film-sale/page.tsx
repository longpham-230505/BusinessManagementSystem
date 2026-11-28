import { BackLink } from "@/components/back-link";
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
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <BackLink href="/orders/new" label="Chọn loại đơn" />
        <h1 className="mt-2 text-2xl font-medium">Tạo đơn bán phim</h1>
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
