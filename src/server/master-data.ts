"use server";

import { FormReader } from "@/lib/form-reader";
import {
  attempt,
  redirectWithError,
  redirectWithNotice,
} from "@/server/form-action";
import { findMasterDataEntity } from "@/server/master-data-entities";

/**
 * Server Actions chung cho dữ liệu nền (cơ sở, model máy, máy, loại phim,
 * dịch vụ in, danh mục tài chính, khách hàng).
 * Chi tiết từng loại nằm ở `master-data-entities.ts`.
 */

const FALLBACK_PATH = "/settings";
const INVALID_ENTITY_MESSAGE = "Loại dữ liệu không hợp lệ.";

export async function saveMasterData(formData: FormData) {
  const form = new FormReader(formData);
  const entity = findMasterDataEntity(form.text("entity"));
  if (!entity) redirectWithError(FALLBACK_PATH, INVALID_ENTITY_MESSAGE);

  const id = form.text("id");
  const result = await attempt(() => entity.save(id, form));
  if (!result.ok) {
    // Đang sửa thì quay lại trang sửa, để người dùng thấy lỗi ngay cạnh dữ liệu đang nhập.
    redirectWithError(id ? entity.editPath(id) : entity.redirectTo, result.message);
  }

  redirectWithNotice(
    entity.redirectTo,
    id ? "Đã cập nhật dữ liệu." : "Đã tạo dữ liệu mới."
  );
}

export async function setMasterDataDeleted(formData: FormData) {
  const form = new FormReader(formData);
  const entity = findMasterDataEntity(form.text("entity"));
  if (!entity) redirectWithError(FALLBACK_PATH, INVALID_ENTITY_MESSAGE);

  const restore = form.text("restore") === "true";
  const result = await attempt(async () =>
    entity.setDeleted(form.requiredText("id", "Bản ghi"), restore)
  );
  if (!result.ok) redirectWithError(entity.redirectTo, result.message);

  redirectWithNotice(
    entity.redirectTo,
    restore ? "Đã khôi phục dữ liệu." : "Đã xóa mềm dữ liệu."
  );
}
