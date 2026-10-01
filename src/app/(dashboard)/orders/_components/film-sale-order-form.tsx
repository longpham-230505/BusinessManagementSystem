import { SubmitButton } from "@/components/form-fields";
import { FilmSaleItemsEditor, type FilmSaleRowValues } from "@/components/film-sale-items-editor";
import type { loadSalesOrderFormOptions } from "@/server/queries/orders.queries";
import { SalesOrderHeaderFields, type SalesOrderHeaderValues } from "./sales-order-header-fields";

type Options = Awaited<ReturnType<typeof loadSalesOrderFormOptions>>;

/** Form tạo hoặc sửa đơn bán phim (sửa: truyền `orderId` và `initial`). */
export function FilmSaleOrderForm({
  options,
  action,
  submitLabel,
  orderId,
  initial,
}: {
  options: Options;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  orderId?: string;
  initial?: { header: SalesOrderHeaderValues; items: FilmSaleRowValues[] };
}) {
  // Chỉ truyền số thuần sang client component (Prisma.Decimal không đi qua được ranh giới server/client).
  const filmTypes = options.filmTypes.map((filmType) => ({
    id: filmType.id,
    name: filmType.name,
    defaultSalePrice: Number(filmType.defaultSalePrice.toString()),
    stock: filmType.stock,
  }));

  return (
    <form
      action={action}
      className="space-y-6 rounded-lg border border-line bg-white p-5 shadow-sm"
    >
      {orderId && <input type="hidden" name="orderId" value={orderId} />}

      <SalesOrderHeaderFields
        customers={options.customers}
        branches={options.branches}
        defaults={initial?.header}
      />
      <FilmSaleItemsEditor filmTypes={filmTypes} initialRows={initial?.items} />

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
