"use server";

import { FormReader } from "@/lib/form-reader";
import { attempt, redirectWithError, redirectWithNotice } from "@/server/form-action";
import {
  createFilmSaleOrder,
  updateFilmSaleOrder,
  type FilmSaleLine,
} from "@/server/services/film-sale.service";
import {
  createPhotoPrintOrder,
  updatePhotoPrintOrder,
  type PhotoPrintLine,
} from "@/server/services/photo-print.service";
import {
  cancelSalesOrder,
  changeSalesOrderStatus,
  SALES_STATUSES,
  type SalesOrderHeader,
} from "@/server/services/sales-order.service";
import { BusinessRuleError } from "@/server/errors";

/**
 * Server Actions của đơn bán phim và đơn in ảnh. Mỗi action chỉ đọc form →
 * gọi service → chuyển trang; logic nghiệp vụ nằm trong `services/`.
 */

const ORDERS_PATH = "/orders";
const FILM_PATH = "/film";
const orderDetailPath = (orderId: string) => `/orders/${orderId}`;
const orderEditPath = (orderId: string) => `/orders/${orderId}/edit`;

// ---------------------------------------------------------------------------
// Đọc form
// ---------------------------------------------------------------------------

function readHeader(form: FormReader): SalesOrderHeader {
  return {
    customerId: form.requiredText("customerId", "Khách hàng"),
    branchId: form.requiredText("branchId", "Cơ sở phụ trách"),
    shippingFee: form.vndOrZero("shippingFee", "Phí ship"),
    discountAmount: form.vndOrZero("discountAmount", "Giảm giá"),
    notes: form.text("notes"),
  };
}

function readFilmSaleItems(form: FormReader): FilmSaleLine[] {
  return form.rows(["filmTypeId", "quantity", "salePrice"]).map((row) => ({
    filmTypeId: row.requiredText("filmTypeId", "Loại phim"),
    quantity: row.positiveInt("quantity", "Số lượng"),
    salePrice: row.requiredVnd("salePrice", "Giá bán"),
  }));
}

function readPhotoPrintItems(form: FormReader): PhotoPrintLine[] {
  const columns = ["printServiceId", "quantity", "unitPrice", "filmTypeId", "filmQuantity"];

  return form.rows(columns).map((row) => {
    const filmTypeId = row.text("filmTypeId");
    if (!filmTypeId && row.text("filmQuantity")) {
      throw new BusinessRuleError(
        "Dòng có số lượng phim thì cần chọn loại phim (hoặc xóa số lượng phim)."
      );
    }

    return {
      printServiceId: row.requiredText("printServiceId", "Dịch vụ in"),
      quantity: row.positiveInt("quantity", "Số lượng ảnh"),
      unitPrice: row.requiredVnd("unitPrice", "Đơn giá"),
      filmTypeId,
      filmQuantity: filmTypeId ? row.positiveInt("filmQuantity", "Số lượng phim") : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Đơn bán phim
// ---------------------------------------------------------------------------

export async function createFilmSaleOrderAction(formData: FormData) {
  const form = new FormReader(formData);

  const result = await attempt(() =>
    createFilmSaleOrder({ ...readHeader(form), items: readFilmSaleItems(form) })
  );
  if (!result.ok) redirectWithError("/orders/new/film-sale", result.message);

  redirectWithNotice(
    orderDetailPath(result.value.id),
    "Đã tạo đơn bán phim và giữ hàng trong kho.",
    [ORDERS_PATH, FILM_PATH]
  );
}

export async function updateFilmSaleOrderAction(formData: FormData) {
  const form = new FormReader(formData);
  const orderId = String(formData.get("orderId") ?? "");

  const result = await attempt(() =>
    updateFilmSaleOrder(orderId, { ...readHeader(form), items: readFilmSaleItems(form) })
  );
  if (!result.ok) redirectWithError(orderEditPath(orderId), result.message);

  redirectWithNotice(orderDetailPath(orderId), "Đã cập nhật đơn và phân bổ lại kho.", [
    ORDERS_PATH,
    FILM_PATH,
  ]);
}

// ---------------------------------------------------------------------------
// Đơn in ảnh
// ---------------------------------------------------------------------------

export async function createPhotoPrintOrderAction(formData: FormData) {
  const form = new FormReader(formData);

  const result = await attempt(() =>
    createPhotoPrintOrder({ ...readHeader(form), items: readPhotoPrintItems(form) })
  );
  if (!result.ok) redirectWithError("/orders/new/photo-print", result.message);

  redirectWithNotice(orderDetailPath(result.value.id), "Đã tạo đơn in ảnh.", [
    ORDERS_PATH,
    FILM_PATH,
  ]);
}

export async function updatePhotoPrintOrderAction(formData: FormData) {
  const form = new FormReader(formData);
  const orderId = String(formData.get("orderId") ?? "");

  const result = await attempt(() =>
    updatePhotoPrintOrder(orderId, { ...readHeader(form), items: readPhotoPrintItems(form) })
  );
  if (!result.ok) redirectWithError(orderEditPath(orderId), result.message);

  redirectWithNotice(orderDetailPath(orderId), "Đã cập nhật đơn và phân bổ lại kho.", [
    ORDERS_PATH,
    FILM_PATH,
  ]);
}

// ---------------------------------------------------------------------------
// Trạng thái và hủy đơn (dùng chung cho cả hai loại đơn)
// ---------------------------------------------------------------------------

export async function changeSalesOrderStatusAction(formData: FormData) {
  const form = new FormReader(formData);
  const orderId = String(formData.get("orderId") ?? "");

  const result = await attempt(() =>
    changeSalesOrderStatus({
      orderId,
      status: form.oneOf("status", "Trạng thái", SALES_STATUSES),
    })
  );
  if (!result.ok) redirectWithError(orderDetailPath(orderId), result.message);

  redirectWithNotice(orderDetailPath(orderId), "Đã cập nhật trạng thái đơn.", [ORDERS_PATH]);
}

export async function cancelSalesOrderAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");

  const result = await attempt(() => cancelSalesOrder({ orderId }));
  if (!result.ok) redirectWithError(orderDetailPath(orderId), result.message);

  redirectWithNotice(orderDetailPath(orderId), "Đã hủy đơn và trả phim về kho.", [
    ORDERS_PATH,
    FILM_PATH,
  ]);
}
