"use client";

import {
  AddRowButton,
  formatVndText,
  RemoveRowButton,
  ROW_INPUT_CLASS,
  useLineRows,
} from "@/components/line-items";

export type PrintServiceOption = { id: string; name: string; unitPrice: number };
export type FilmOption = { id: string; name: string; stock: number };

export type PrintRowValues = {
  printServiceId: string;
  quantity: string;
  unitPrice: string;
  filmTypeId: string;
  filmQuantity: string;
};

// Dòng mới để trống hoàn toàn để dòng bỏ quên không bị báo lỗi (Server Action bỏ qua dòng trống).
const EMPTY_ROW: PrintRowValues = {
  printServiceId: "",
  quantity: "",
  unitPrice: "",
  filmTypeId: "",
  filmQuantity: "",
};

/**
 * Các dòng của đơn in ảnh: dịch vụ in, số lượng ảnh, đơn giá, và (không bắt buộc)
 * loại phim + số lượng phim dùng — phần này sẽ trừ kho phim theo FIFO.
 */
export function PrintItemsEditor({
  printServices,
  filmTypes,
  initialRows,
}: {
  printServices: PrintServiceOption[];
  filmTypes: FilmOption[];
  initialRows?: PrintRowValues[];
}) {
  const { rows, addRow, removeRow, updateRow } = useLineRows(initialRows, EMPTY_ROW);

  const subtotal = rows.reduce(
    (sum, row) => sum + (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0),
    0
  );

  function selectService(key: number, printServiceId: string) {
    const service = printServices.find((candidate) => candidate.id === printServiceId);
    const row = rows.find((candidate) => candidate.key === key);
    updateRow(key, {
      printServiceId,
      quantity: service ? row?.quantity || "1" : "",
      unitPrice: service ? String(service.unitPrice) : "",
    });
  }

  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 text-sm font-medium">
        Dịch vụ in <span className="text-red-700">*</span>
      </legend>

      {rows.map((row) => {
        const film = filmTypes.find((candidate) => candidate.id === row.filmTypeId);
        return (
          <div key={row.key} className="space-y-2 rounded border border-line p-3">
            <div className="grid grid-cols-12 items-center gap-2">
              <select
                name="printServiceId"
                value={row.printServiceId}
                onChange={(event) => selectService(row.key, event.target.value)}
                className={`${ROW_INPUT_CLASS} col-span-12 sm:col-span-6`}
              >
                <option value="">Chọn dịch vụ in</option>
                {printServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              <input
                name="quantity"
                type="number"
                min={1}
                placeholder="Số ảnh"
                value={row.quantity}
                onChange={(event) => updateRow(row.key, { quantity: event.target.value })}
                className={`${ROW_INPUT_CLASS} col-span-5 sm:col-span-2`}
              />
              <input
                name="unitPrice"
                type="number"
                min={0}
                placeholder="Đơn giá"
                value={row.unitPrice}
                onChange={(event) => updateRow(row.key, { unitPrice: event.target.value })}
                className={`${ROW_INPUT_CLASS} col-span-6 sm:col-span-3`}
              />
              <div className="col-span-1 flex justify-end">
                <RemoveRowButton onClick={() => removeRow(row.key)} />
              </div>
            </div>

            <div className="grid grid-cols-12 items-start gap-2">
              <div className="col-span-12 sm:col-span-6">
                <select
                  name="filmTypeId"
                  value={row.filmTypeId}
                  onChange={(event) =>
                    updateRow(row.key, {
                      filmTypeId: event.target.value,
                      filmQuantity: event.target.value ? row.filmQuantity || "1" : "",
                    })
                  }
                  className={ROW_INPUT_CLASS}
                >
                  <option value="">Không dùng phim của cửa hàng</option>
                  {filmTypes.map((filmType) => (
                    <option key={filmType.id} value={filmType.id}>
                      Dùng phim: {filmType.name}
                    </option>
                  ))}
                </select>
                {film && <p className="mt-1 text-xs text-ink/55">Tồn kho: {film.stock}</p>}
              </div>
              <input
                name="filmQuantity"
                type="number"
                min={1}
                placeholder="Số phim dùng"
                // readOnly (không dùng disabled): input bị disabled không được gửi đi, sẽ làm lệch các dòng.
                readOnly={!row.filmTypeId}
                value={row.filmQuantity}
                onChange={(event) => updateRow(row.key, { filmQuantity: event.target.value })}
                className={`${ROW_INPUT_CLASS} col-span-6 read-only:bg-ink/5 sm:col-span-3`}
              />
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between">
        <AddRowButton onClick={addRow} label="Thêm dịch vụ in" />
        <p className="text-sm">
          Tạm tính: <b>{formatVndText(subtotal)}</b>
        </p>
      </div>
    </fieldset>
  );
}
