import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, FlashMessages, type FlashSearchParams } from "@/components/flash-messages";
import {
  findSalesOrderDetail,
  loadSalesOrderFormOptions,
  type SalesOrderDetail,
} from "@/server/queries/orders.queries";
import {
  updateFilmSaleOrderAction,
  updatePhotoPrintOrderAction,
} from "@/server/sales-order-actions";
import { FilmSaleOrderForm } from "../../_components/film-sale-order-form";
import { PhotoPrintOrderForm } from "../../_components/photo-print-order-form";
import type { SalesOrderHeaderValues } from "../../_components/sales-order-header-fields";

/** Sửa đơn bán phim / in ảnh. Khi lưu, phim của đơn được trả về kho rồi phân bổ lại theo FIFO. */
export async function SalesOrderEditView({ id, flash }: { id: string; flash: FlashSearchParams }) {
  const [order, options] = await Promise.all([
    findSalesOrderDetail(id),
    loadSalesOrderFormOptions(),
  ]);
  if (!order) notFound();

  const header = toHeaderValues(order);

  return (
    <div className="max-w-4xl space-y-5">
      <header>
        <Link href={`/orders/${id}`} className="text-sm text-accent underline">
          ← {order.orderCode}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Sửa đơn {order.orderCode}</h1>
        <p className="mt-1 text-sm text-ink/60">
          Khi lưu, phim của đơn này được trả về kho rồi phân bổ lại từ tồn kho hiện tại. Giá vốn của
          các đơn khác không bị tính lại.
        </p>
      </header>

      <FlashMessages error={flash.error} />

      {order.status === "CANCELLED" ? (
        <Alert tone="warning">Đơn đã hủy nên không thể sửa.</Alert>
      ) : order.orderType === "FILM_SALE" ? (
        <FilmSaleOrderForm
          options={options}
          action={updateFilmSaleOrderAction}
          submitLabel="Lưu thay đổi"
          orderId={order.id}
          initial={{
            header,
            items: order.filmSaleItems.map((item) => ({
              filmTypeId: item.filmTypeId,
              quantity: String(item.quantity),
              salePrice: item.salePrice.toString(),
            })),
          }}
        />
      ) : (
        <PhotoPrintOrderForm
          options={options}
          action={updatePhotoPrintOrderAction}
          submitLabel="Lưu thay đổi"
          orderId={order.id}
          initial={{
            header,
            items: order.photoPrintItems.map((item) => ({
              printServiceId: item.printServiceId,
              quantity: String(item.quantity),
              unitPrice: item.unitPrice.toString(),
              filmTypeId: item.filmTypeId ?? "",
              filmQuantity: item.filmQuantity ? String(item.filmQuantity) : "",
            })),
          }}
        />
      )}
    </div>
  );
}

function toHeaderValues(order: SalesOrderDetail): SalesOrderHeaderValues {
  return {
    customerId: order.customerId,
    branchId: order.branchId,
    shippingFee: order.shippingFee.toString(),
    discountAmount: order.discountAmount.toString(),
    notes: order.notes ?? "",
  };
}
