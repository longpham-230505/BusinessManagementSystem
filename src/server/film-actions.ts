"use server";

import { FormReader } from "@/lib/form-reader";
import { attempt, redirectWithError, redirectWithNotice } from "@/server/form-action";
import {
  adjustFilmStock,
  deleteUnusedFilmBatch,
  importFilmBatch,
} from "@/server/services/film-inventory.service";

/** Server Actions của kho phim: nhập lô, điều chỉnh tồn, xóa lô nhập nhầm. */

const FILM_PATH = "/film";

export async function importFilmBatchAction(formData: FormData) {
  const form = new FormReader(formData);

  const result = await attempt(() =>
    importFilmBatch({
      filmTypeId: form.requiredText("filmTypeId", "Loại phim"),
      quantity: form.positiveInt("quantity", "Số lượng nhập"),
      unitCost: form.requiredVnd("unitCost", "Giá nhập"),
      receivedDate: form.requiredDate("receivedDate", "Ngày nhập"),
      notes: form.text("notes"),
    })
  );
  if (!result.ok) redirectWithError(FILM_PATH, result.message);

  redirectWithNotice(FILM_PATH, "Đã nhập lô phim mới.");
}

export async function adjustFilmStockAction(formData: FormData) {
  const form = new FormReader(formData);

  const result = await attempt(() =>
    adjustFilmStock({
      batchId: form.requiredText("batchId", "Lô phim"),
      quantityDelta: form.nonZeroInt("quantityDelta", "Số lượng điều chỉnh"),
      reason: form.requiredText("reason", "Lý do"),
    })
  );
  if (!result.ok) redirectWithError(FILM_PATH, result.message);

  redirectWithNotice(FILM_PATH, "Đã điều chỉnh tồn kho.");
}

export async function deleteFilmBatchAction(formData: FormData) {
  const form = new FormReader(formData);

  const result = await attempt(() =>
    deleteUnusedFilmBatch(form.requiredText("batchId", "Lô phim"))
  );
  if (!result.ok) redirectWithError(FILM_PATH, result.message);

  redirectWithNotice(FILM_PATH, "Đã xóa lô nhập nhầm.");
}
