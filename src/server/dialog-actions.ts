"use server";

import { revalidatePath } from "next/cache";
import { FormReader } from "@/lib/form-reader";
import type { DialogActionResult } from "@/lib/action-result";
import { attempt } from "@/server/form-action";
import { MASTER_DATA_ENTITIES, readCustomerData } from "@/server/master-data-entities";
import { createCustomer, type CustomerOption } from "@/server/services/customer.service";

/**
 * Server Action cho các hộp thoại "thêm mới". Trả về kết quả thay vì redirect, để hộp
 * thoại giữ nguyên dữ liệu đang nhập khi lỗi (và để form đơn hàng phía sau không bị tải lại).
 */

/** Tạo khách hàng — dùng ở trang Khách hàng và ở ô chọn khách khi tạo đơn. */
export async function createCustomerFromDialogAction(
  formData: FormData
): Promise<DialogActionResult<CustomerOption>> {
  const form = new FormReader(formData);

  const result = await attempt(() => createCustomer(readCustomerData(form)));
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath("/customers");
  return { ok: true, notice: "Đã thêm khách hàng.", data: result.value };
}

/** Tạo máy ảnh — dùng ở trang Máy ảnh. */
export async function createCameraFromDialogAction(
  formData: FormData
): Promise<DialogActionResult> {
  const form = new FormReader(formData);

  const result = await attempt(() => MASTER_DATA_ENTITIES.cameraInstance.save(null, form));
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath("/cameras");
  return { ok: true, notice: "Đã thêm máy.", data: undefined };
}
