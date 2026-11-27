"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { DialogActionResult } from "@/lib/action-result";
import { Modal, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/modal";

export type CustomerOption = { id: string; name: string; phone: string | null };

const SELECT_CLASS = "w-full rounded border border-line px-3 py-2";

/**
 * Ô chọn khách hàng của form đơn hàng: chọn khách có sẵn, hoặc bấm "+ Khách mới" để mở
 * hộp thoại tạo khách ngay tại chỗ. Tạo xong, khách mới được chọn sẵn và mọi thứ người
 * dùng đã nhập vào đơn vẫn nguyên (trang không bị tải lại).
 *
 * @param createCustomer Server Action tạo khách (truyền từ server component để dễ thay thế khi test)
 * @param children       các trường nhập của khách hàng, hiển thị trong hộp thoại
 */
export function CustomerPicker({
  customers,
  defaultValue = "",
  createCustomer,
  children,
}: {
  customers: CustomerOption[];
  defaultValue?: string;
  createCustomer: (formData: FormData) => Promise<DialogActionResult<CustomerOption>>;
  children: ReactNode;
}) {
  const [created, setCreated] = useState<CustomerOption[]>([]);
  const [selectedId, setSelectedId] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Khách có sẵn + khách vừa tạo (loại trùng nếu server đã tải lại danh sách), xếp theo tên.
  const options = [
    ...customers,
    ...created.filter((c) => !customers.some((o) => o.id === c.id)),
  ].sort((a, b) => a.name.localeCompare(b.name, "vi"));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Form này nằm trong portal nhưng vẫn là con của form đơn hàng trong cây React:
    // chặn sự kiện nổi lên để không kích hoạt form đơn hàng.
    event.preventDefault();
    event.stopPropagation();
    setIsPending(true);
    setError(null);

    try {
      const result = await createCustomer(new FormData(event.currentTarget));
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setCreated((current) => [...current, result.data]);
      setSelectedId(result.data.id);
      setIsOpen(false);
    } catch {
      setError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="block text-sm">
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor="customerId" className="text-ink/70">
          Khách hàng
        </label>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsOpen(true);
          }}
          className="text-accent underline"
        >
          + Khách mới
        </button>
      </div>

      <select
        id="customerId"
        name="customerId"
        required
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">Chọn khách</option>
        {options.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name}
            {customer.phone ? ` — ${customer.phone}` : ""}
          </option>
        ))}
      </select>

      {isOpen && (
        <Modal title="Thêm khách hàng mới" onClose={() => setIsOpen(false)} widthClass="max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="grid gap-3 md:grid-cols-2">{children}</div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={SECONDARY_BUTTON_CLASS}
              >
                Hủy
              </button>
              <button disabled={isPending} className={PRIMARY_BUTTON_CLASS}>
                {isPending ? "Đang lưu…" : "Lưu và chọn khách này"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
