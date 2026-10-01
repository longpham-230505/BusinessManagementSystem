import { FlashMessages, type FlashSearchParams } from "@/components/flash-messages";
import { Field, SelectField, SubmitButton, TABLE_WRAPPER_CLASS } from "@/components/form-fields";
import { formatDateOnly, VN_TIME_ZONE, vnDateInputValue } from "@/lib/datetime";
import { formatVnd } from "@/lib/money";
import {
  adjustFilmStockAction,
  deleteFilmBatchAction,
  importFilmBatchAction,
} from "@/server/film-actions";
import {
  listFilmBatches,
  listFilmTypesWithStock,
  listRecentStockAdjustments,
} from "@/server/queries/film.queries";

export default async function FilmInventoryPage({
  searchParams,
}: {
  searchParams: Promise<FlashSearchParams>;
}) {
  const [filmTypes, batches, adjustments, flash] = await Promise.all([
    listFilmTypesWithStock(),
    listFilmBatches(),
    listRecentStockAdjustments(),
    searchParams,
  ]);

  // Giá trị tồn = Σ số lượng còn lại × giá vốn của từng lô.
  const stockValueByType = new Map<string, number>();
  for (const batch of batches) {
    const value = batch.quantityRemaining * Number(batch.unitCost.toString());
    stockValueByType.set(batch.filmTypeId, (stockValueByType.get(batch.filmTypeId) ?? 0) + value);
  }

  return (
    <div className="max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Kho phim</h1>
        <p className="mt-1 text-sm text-ink/60">
          Một kho chung cho mọi cơ sở, quản lý theo lô nhập và trừ theo FIFO.
        </p>
      </header>

      <FlashMessages {...flash} />

      <section className="space-y-3">
        <h2 className="font-medium">Tồn kho theo loại phim</h2>
        <div className={TABLE_WRAPPER_CLASS}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-ink/5">
              <tr>
                <th className="p-3">Loại phim</th>
                <th className="p-3">Tồn kho</th>
                <th className="p-3">Giá trị tồn (theo giá vốn)</th>
              </tr>
            </thead>
            <tbody>
              {filmTypes.map((filmType) => (
                <tr key={filmType.id} className="border-b border-line">
                  <td className="p-3 font-medium">{filmType.name}</td>
                  <td className="p-3">{filmType.stock}</td>
                  <td className="p-3">{formatVnd(stockValueByType.get(filmType.id) ?? 0)}</td>
                </tr>
              ))}
              {filmTypes.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-5 text-ink/50">
                    Chưa có loại phim. Hãy tạo trong Cài đặt trước.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Nhập lô phim mới</h2>
        <form
          action={importFilmBatchAction}
          className="grid gap-3 rounded-lg border border-line bg-white p-5 shadow-sm md:grid-cols-3"
        >
          <SelectField name="filmTypeId" label="Loại phim" required>
            <option value="">Chọn loại phim</option>
            {filmTypes.map((filmType) => (
              <option key={filmType.id} value={filmType.id}>
                {filmType.name}
              </option>
            ))}
          </SelectField>
          <Field name="quantity" label="Số lượng nhập" type="number" min={1} required />
          <Field name="unitCost" label="Giá nhập (mỗi cuộn)" type="number" required />
          <Field
            name="receivedDate"
            label="Ngày nhập"
            type="date"
            defaultValue={vnDateInputValue()}
            required
          />
          <Field name="notes" label="Ghi chú" className="md:col-span-2" />
          <SubmitButton className="md:col-span-3">Nhập kho</SubmitButton>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Các lô nhập</h2>
        <div className={TABLE_WRAPPER_CLASS}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-ink/5">
              <tr>
                <th className="p-3">Loại phim / Ngày nhập</th>
                <th className="p-3">Còn / Ban đầu</th>
                <th className="p-3">Giá nhập</th>
                <th className="p-3">Điều chỉnh tồn</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id} className="border-b border-line align-top">
                  <td className="p-3">
                    <b>{batch.filmType.name}</b>
                    <br />
                    <span className="text-ink/55">{formatDateOnly(batch.receivedDate)}</span>
                    {batch.notes && (
                      <>
                        <br />
                        <span className="text-ink/55">{batch.notes}</span>
                      </>
                    )}
                  </td>
                  <td className="p-3">
                    {batch.quantityRemaining} / {batch.quantityOriginal}
                  </td>
                  <td className="p-3">{formatVnd(batch.unitCost)}</td>
                  <td className="p-3">
                    <form action={adjustFilmStockAction} className="flex flex-wrap gap-2">
                      <input type="hidden" name="batchId" value={batch.id} />
                      <input
                        name="quantityDelta"
                        type="number"
                        required
                        placeholder="± SL"
                        className="w-20 rounded border border-line px-2 py-1"
                      />
                      <input
                        name="reason"
                        required
                        placeholder="Lý do (hao hụt, kiểm kê…)"
                        className="w-48 rounded border border-line px-2 py-1"
                      />
                      <button className="rounded border border-line px-3 py-1 text-accent">
                        Điều chỉnh
                      </button>
                    </form>
                  </td>
                  <td className="p-3">
                    <form action={deleteFilmBatchAction}>
                      <input type="hidden" name="batchId" value={batch.id} />
                      <button className="text-red-700" title="Chỉ xóa được lô chưa từng dùng">
                        Xóa
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-5 text-ink/50">
                    Chưa có lô nhập nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink/55">
          Số điều chỉnh âm = hao hụt (tính là chi phí theo giá vốn của lô), dương = tìm thấy thêm.
          Chỉ xóa được lô nhập nhầm chưa từng được dùng hoặc điều chỉnh.
        </p>
      </section>

      {adjustments.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">Điều chỉnh gần đây</h2>
          <div className={TABLE_WRAPPER_CLASS}>
            <table className="w-full text-left text-sm">
              <tbody>
                {adjustments.map((adjustment) => (
                  <tr key={adjustment.id} className="border-b border-line">
                    <td className="p-3">
                      {adjustment.adjustedAt.toLocaleDateString("vi-VN", {
                        timeZone: VN_TIME_ZONE,
                      })}
                    </td>
                    <td className="p-3">
                      {adjustment.filmBatch.filmType.name} (lô{" "}
                      {formatDateOnly(adjustment.filmBatch.receivedDate)})
                    </td>
                    <td className="p-3 font-medium">
                      {adjustment.quantityDelta > 0 ? "+" : ""}
                      {adjustment.quantityDelta}
                    </td>
                    <td className="p-3 text-ink/70">{adjustment.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
