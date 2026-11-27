"use client";

import {
  AddRowButton,
  formatVndText,
  RemoveRowButton,
  ROW_INPUT_CLASS,
  useLineRows,
} from "@/components/line-items";

export type FilmTypeOption = {
  id: string;
  name: string;
  defaultSalePrice: number;
  stock: number;
};

export type FilmSaleRowValues = {
  filmTypeId: string;
  quantity: string;
  salePrice: string;
};

// Dòng mới để trống hoàn toàn để dòng bỏ quên không bị báo lỗi (Server Action bỏ qua dòng trống).
const EMPTY_ROW: FilmSaleRowValues = { filmTypeId: "", quantity: "", salePrice: "" };

/**
 * Các dòng của đơn bán phim: loại phim, số lượng, giá bán (mặc định theo loại phim, sửa được).
 * Mỗi input cùng tên xuất hiện một lần ở mỗi dòng — Server Action đọc chúng theo vị trí.
 */
export function FilmSaleItemsEditor({
  filmTypes,
  initialRows,
}: {
  filmTypes: FilmTypeOption[];
  initialRows?: FilmSaleRowValues[];
}) {
  const { rows, addRow, removeRow, updateRow } = useLineRows(initialRows, EMPTY_ROW);

  const subtotal = rows.reduce(
    (sum, row) => sum + (Number(row.quantity) || 0) * (Number(row.salePrice) || 0),
    0
  );

  function selectFilmType(key: number, filmTypeId: string) {
    const filmType = filmTypes.find((candidate) => candidate.id === filmTypeId);
    const row = rows.find((candidate) => candidate.key === key);
    updateRow(key, {
      filmTypeId,
      quantity: filmType ? row?.quantity || "1" : "",
      salePrice: filmType ? String(filmType.defaultSalePrice) : "",
    });
  }

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-medium">
        Các loại phim <span className="text-red-700">*</span>
      </legend>

      {rows.map((row) => {
        const selected = filmTypes.find((candidate) => candidate.id === row.filmTypeId);
        return (
          <div key={row.key} className="grid grid-cols-12 items-start gap-2">
            <div className="col-span-12 sm:col-span-5">
              <select
                name="filmTypeId"
                value={row.filmTypeId}
                onChange={(event) => selectFilmType(row.key, event.target.value)}
                className={ROW_INPUT_CLASS}
              >
                <option value="">Chọn loại phim</option>
                {filmTypes.map((filmType) => (
                  <option key={filmType.id} value={filmType.id}>
                    {filmType.name}
                  </option>
                ))}
              </select>
              {selected && <p className="mt-1 text-xs text-ink/55">Tồn kho: {selected.stock}</p>}
            </div>
            <input
              name="quantity"
              type="number"
              min={1}
              placeholder="SL"
              value={row.quantity}
              onChange={(event) => updateRow(row.key, { quantity: event.target.value })}
              className={`${ROW_INPUT_CLASS} col-span-5 sm:col-span-2`}
            />
            <input
              name="salePrice"
              type="number"
              min={0}
              placeholder="Giá bán"
              value={row.salePrice}
              onChange={(event) => updateRow(row.key, { salePrice: event.target.value })}
              className={`${ROW_INPUT_CLASS} col-span-6 sm:col-span-4`}
            />
            <div className="col-span-1 flex justify-end">
              <RemoveRowButton onClick={() => removeRow(row.key)} />
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between">
        <AddRowButton onClick={addRow} label="Thêm loại phim" />
        <p className="text-sm">
          Tạm tính: <b>{formatVndText(subtotal)}</b>
        </p>
      </div>
    </fieldset>
  );
}
