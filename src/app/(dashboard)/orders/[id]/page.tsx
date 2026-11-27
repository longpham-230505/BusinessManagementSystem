import { notFound } from "next/navigation";
import type { FlashSearchParams } from "@/components/flash-messages";
import { findOrderType } from "@/server/queries/orders.queries";
import { RentalOrderView } from "./rental-order-view";
import { SalesOrderView } from "./sales-order-view";

/** Trang chi tiết đơn: chọn giao diện theo loại đơn (thuê máy / bán phim / in ảnh). */
export default async function OrderDetailPage({
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
    <RentalOrderView id={id} flash={flash} />
  ) : (
    <SalesOrderView id={id} flash={flash} />
  );
}
