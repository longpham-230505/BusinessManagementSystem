"use client";

import { useRef, useState } from "react";

/**
 * Hook quản lý các dòng của bảng nhập liệu động (thêm / xóa dòng).
 * Mỗi dòng có `key` ổn định để React không lẫn giá trị khi xóa dòng ở giữa.
 */
export function useLineRows<T extends object>(initialRows: T[] | undefined, emptyRow: T) {
  const nextKey = useRef(0);
  const withKey = (row: T) => ({ ...row, key: nextKey.current++ });

  const [rows, setRows] = useState(() =>
    (initialRows && initialRows.length > 0 ? initialRows : [emptyRow]).map(withKey)
  );

  return {
    rows,
    addRow: () => setRows((current) => [...current, withKey(emptyRow)]),
    removeRow: (key: number) =>
      setRows((current) =>
        current.length > 1 ? current.filter((row) => row.key !== key) : current
      ),
    updateRow: (key: number, changes: Partial<T>) =>
      setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row))),
  };
}

export const ROW_INPUT_CLASS = "w-full rounded border border-line px-2 py-2 text-sm";

export function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-line px-3 py-1.5 text-sm text-accent hover:bg-accent/10"
    >
      + {label}
    </button>
  );
}

export function RemoveRowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Xóa dòng"
      className="px-2 text-lg leading-none text-red-700"
    >
      ×
    </button>
  );
}

export const formatVndText = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;
