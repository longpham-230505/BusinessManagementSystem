"use server";

import { FormReader } from "@/lib/form-reader";
import { BusinessRuleError } from "@/server/errors";
import {
  attempt,
  redirectWithError,
  redirectWithNotice,
} from "@/server/form-action";
import { SECURITY_DEPOSIT_KINDS } from "@/server/services/deposit.service";
import {
  cancelRental,
  completeRental,
  createRentalOrder,
  receiveBookingDeposit,
  resolveRentalDeposit,
  returnRental,
  startRental,
  updateRentalOrder,
  type CreateRentalOrderInput,
} from "@/server/services/rental.service";

/**
 * Server Actions của đơn thuê. Mỗi action chỉ làm 3 việc:
 * đọc form → gọi service → chuyển trang. Logic nghiệp vụ nằm trong `services/`.
 */

const ORDERS_PATH = "/orders";
const NEW_ORDER_PATH = "/orders/new/rental";
const orderDetailPath = (orderId: string) => `/orders/${orderId}`;

// ---------------------------------------------------------------------------
// Tạo đơn
// ---------------------------------------------------------------------------

function readCreateRentalOrderForm(form: FormReader): CreateRentalOrderInput {
  const cameraIds = form.textList("cameraIds");
  if (cameraIds.length === 0) {
    throw new BusinessRuleError("Hãy chọn ít nhất một máy.");
  }

  return {
    customerId: form.requiredText("customerId", "Khách hàng"),
    branchId: form.requiredText("branchId", "Cơ sở giao máy"),
    cameraIds,
    pickupAt: form.requiredDateTime("pickupAt", "Thời điểm nhận máy"),
    returnDueAt: form.requiredDateTime("returnDueAt", "Hạn trả máy"),
    notes: form.text("notes"),
  };
}

export async function createRentalOrderAction(formData: FormData) {
  const form = new FormReader(formData);

  const result = await attempt(() =>
    createRentalOrder(readCreateRentalOrderForm(form))
  );
  if (!result.ok) redirectWithError(NEW_ORDER_PATH, result.message);

  redirectWithNotice(
    orderDetailPath(result.value.id),
    "Đã tạo đơn thuê. Hãy nhận cọc giữ chỗ để xác nhận đặt máy.",
    [ORDERS_PATH]
  );
}

export async function updateRentalOrderAction(formData: FormData) {
  const form = new FormReader(formData);
  const orderId = String(formData.get("orderId") ?? "");

  const result = await attempt(() =>
    updateRentalOrder(orderId, readCreateRentalOrderForm(form))
  );
  if (!result.ok) redirectWithError(`/orders/${orderId}/edit`, result.message);

  redirectWithNotice(orderDetailPath(orderId), "Đã cập nhật đơn thuê.", [ORDERS_PATH]);
}

// ---------------------------------------------------------------------------
// Các sự kiện trong vòng đời đơn
// ---------------------------------------------------------------------------

/**
 * Khung chung của mọi sự kiện trên trang chi tiết đơn: đọc `orderId`, chạy sự
 * kiện, rồi quay lại trang chi tiết kèm thông báo thành công hoặc lỗi.
 */
async function handleOrderEvent(
  formData: FormData,
  successNotice: string,
  runEvent: (orderId: string, form: FormReader) => Promise<void>
) {
  const form = new FormReader(formData);
  const detailPath = orderDetailPath(String(formData.get("orderId") ?? ""));

  const result = await attempt(() =>
    runEvent(form.requiredText("orderId", "Đơn hàng"), form)
  );
  if (!result.ok) redirectWithError(detailPath, result.message);

  redirectWithNotice(detailPath, successNotice, [ORDERS_PATH]);
}

export async function receiveBookingDepositAction(formData: FormData) {
  await handleOrderEvent(
    formData,
    "Đã ghi nhận cọc giữ chỗ.",
    (orderId, form) =>
      receiveBookingDeposit({
        orderId,
        amount: form.vndOrZero("amount", "Số tiền cọc giữ chỗ"),
      })
  );
}

export async function startRentalAction(formData: FormData) {
  await handleOrderEvent(formData, "Đã giao máy cho khách.", (orderId, form) =>
    startRental({
      orderId,
      securityDepositKind: form.oneOf(
        "securityDepositKind",
        "Loại cọc bảo đảm",
        SECURITY_DEPOSIT_KINDS
      ),
      cashAmount: form.vndOrZero("cashAmount", "Số tiền cọc"),
      itemDescription: form.text("itemDescription"),
    })
  );
}

export async function returnRentalAction(formData: FormData) {
  await handleOrderEvent(formData, "Đã nhận máy trả.", (orderId, form) =>
    returnRental({
      orderId,
      returnBranchId: form.requiredText("returnBranchId", "Cơ sở nhận máy"),
    })
  );
}

export async function resolveDepositAction(formData: FormData) {
  await handleOrderEvent(formData, "Đã xử lý khoản cọc.", (orderId, form) =>
    resolveRentalDeposit({
      orderId,
      depositId: form.requiredText("depositId", "Khoản cọc"),
      refunded: form.vndOrZero("refunded", "Số tiền hoàn"),
      forfeited: form.vndOrZero("forfeited", "Số tiền giữ lại"),
      note: form.text("resolutionNote"),
    })
  );
}

export async function completeRentalAction(formData: FormData) {
  await handleOrderEvent(formData, "Đã hoàn tất đơn thuê.", (orderId) =>
    completeRental({ orderId })
  );
}

export async function cancelRentalAction(formData: FormData) {
  await handleOrderEvent(formData, "Đã hủy đơn thuê.", (orderId) =>
    cancelRental({ orderId })
  );
}
