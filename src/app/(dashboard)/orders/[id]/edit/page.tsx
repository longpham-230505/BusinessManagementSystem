import { notFound } from "next/navigation";
import type { FlashSearchParams } from "@/components/flash-messages";
import { findOrderType } from "@/server/queries/orders.queries";
import { RentalOrderEditView } from "./rental-order-edit-view";
import { SalesOrderEditView } from "./sales-order-edit-view";

/** Trang sửa đơn: chọn giao diện theo loại đơn (thuê máy / bán phim / in ảnh). */
export default async function EditOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<FlashSearchParams>;
}) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);

  const orderType = await findOrderType(id);
  if (!orderType) notFound();

  return orderType === "RENTAL" ? (
    <RentalOrderEditView id={id} flash={flash} />
  ) : (
    <SalesOrderEditView id={id} flash={flash} />
  );
}
