"use client";

import { useState } from "react";
import { formatVnDateTime, parseVnDateTimeLocal } from "@/lib/datetime";
import { MAX_RENTAL_DAYS, suggestRentalDays } from "@/lib/rental-days";

const INPUT_CLASS = "w-full rounded border border-line px-3 py-2";

function suggestFromInputs(pickup: string, returnDue: string): number | null {
  const pickupAt = parseVnDateTimeLocal(pickup);
  const returnDueAt = parseVnDateTimeLocal(returnDue);
  if (!pickupAt || !returnDueAt) return null;
  return suggestRentalDays(pickupAt, returnDueAt);
}

/**
 * Nhận máy / Hạn trả / Số ngày thuê.
 *
 * Số ngày thuê được gợi ý từ hai mốc thời gian (làm tròn lên theo 24 giờ) nhưng người
 * dùng có thể sửa tay. Mỗi lần đổi mốc thời gian, số ngày được gợi ý lại.
 *
 * Phần bị khóa theo trạng thái đơn hiển thị dạng chữ kèm input ẩn giữ nguyên giá trị
 * (input `disabled` không được gửi đi). Số ngày khóa cùng với hạn trả.
 */
export function RentalScheduleFields({
  defaultPickupAt = "",
  defaultReturnDueAt = "",
  defaultRentalDays,
  pickupLocked = false,
  returnLocked = false,
}: {
  /** Giá trị `datetime-local` theo giờ Việt Nam. */
  defaultPickupAt?: string;
  defaultReturnDueAt?: string;
  /** Số ngày đã lưu của đơn (khi sửa đơn). Bỏ trống khi tạo mới. */
  defaultRentalDays?: number;
  pickupLocked?: boolean;
  returnLocked?: boolean;
}) {
  const [pickupAt, setPickupAt] = useState(defaultPickupAt);
  const [returnDueAt, setReturnDueAt] = useState(defaultReturnDueAt);
  const [days, setDays] = useState(
    defaultRentalDays !== undefined
      ? String(defaultRentalDays)
      : String(suggestFromInputs(defaultPickupAt, defaultReturnDueAt) ?? "")
  );

  const suggestion = suggestFromInputs(pickupAt, returnDueAt);

  function changeSchedule(nextPickup: string, nextReturnDue: string) {
    setPickupAt(nextPickup);
    setReturnDueAt(nextReturnDue);
    const next = suggestFromInputs(nextPickup, nextReturnDue);
    if (next !== null) setDays(String(next));
  }

  return (
    <>
      {pickupLocked ? (
        <LockedValue name="pickupAt" label="Nhận máy" value={pickupAt} />
      ) : (
        <label className="block text-sm">
          <span className="mb-1 block text-ink/70">Nhận máy</span>
          <input
            name="pickupAt"
            type="datetime-local"
            required
            value={pickupAt}
            onChange={(event) => changeSchedule(event.target.value, returnDueAt)}
            className={INPUT_CLASS}
          />
        </label>
      )}

      {returnLocked ? (
        <LockedValue name="returnDueAt" label="Hạn trả máy" value={returnDueAt} />
      ) : (
        <label className="block text-sm">
          <span className="mb-1 block text-ink/70">Hạn trả máy</span>
          <input
            name="returnDueAt"
            type="datetime-local"
            required
            value={returnDueAt}
            onChange={(event) => changeSchedule(pickupAt, event.target.value)}
            className={INPUT_CLASS}
          />
        </label>
      )}

      {returnLocked ? (
        <div className="text-sm">
          <span className="mb-1 block text-ink/70">Số ngày thuê (đã khóa)</span>
          <b>{days} ngày</b>
          <input type="hidden" name="rentalDays" value={days} />
        </div>
      ) : (
        <label className="block text-sm">
          <span className="mb-1 block text-ink/70">Số ngày thuê</span>
          <input
            name="rentalDays"
            type="number"
            min={1}
            max={MAX_RENTAL_DAYS}
            step={1}
            required
            value={days}
            onChange={(event) => setDays(event.target.value)}
            className={INPUT_CLASS}
          />
          <span className="mt-1 block text-xs text-ink/60">
            {suggestion === null
              ? "Nhập nhận máy và hạn trả để có gợi ý số ngày."
              : `Gợi ý theo thời gian: ${suggestion} ngày (làm tròn lên mỗi 24 giờ). Có thể sửa tay.`}
            {suggestion !== null && days !== String(suggestion) && (
              <>
                {" "}
                <button
                  type="button"
                  className="text-accent underline"
                  onClick={() => setDays(String(suggestion))}
                >
                  Dùng gợi ý
                </button>
              </>
            )}
          </span>
        </label>
      )}
    </>
  );
}

function LockedValue({ name, label, value }: { name: string; label: string; value: string }) {
  const date = parseVnDateTimeLocal(value);
  return (
    <div className="text-sm">
      <span className="mb-1 block text-ink/70">{label} (đã khóa)</span>
      <b>{date ? formatVnDateTime(date) : value}</b>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
