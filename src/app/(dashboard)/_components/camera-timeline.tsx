import Link from "next/link";
import { addDays, formatVnDateTime, vnDateKey, VN_TIME_ZONE } from "@/lib/datetime";
import {
  ORDER_STATUS_LABEL,
  RENTAL_TIMELINE_STYLE,
  type RentalTimelineTone,
} from "@/lib/labels";
import {
  countLanes,
  DAYS_IN_WEEK,
  layoutTimelineBars,
  type TimelineBar,
} from "@/lib/rental-timeline";
import type { TimelineBookingRow, TimelineCamera } from "@/server/queries/timeline.queries";

const WEEKDAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
/** Cột nhãn máy + 7 cột ngày. */
const GRID_COLUMNS = `11rem repeat(${DAYS_IN_WEEK}, minmax(7rem, 1fr))`;
const MAINTENANCE_TINT = "bg-yellow-50";

type Bar = TimelineBar<TimelineBookingRow>;

/**
 * Bảng lịch tuần: mỗi máy một dòng (nhóm theo dòng máy), mỗi lượt thuê là một thanh
 * trải qua các ngày thuê, tô màu theo trạng thái đơn. Chỉ đọc — bấm thanh để mở đơn.
 */
export function CameraTimeline({
  weekStart,
  cameras,
  bookings,
  now = new Date(),
}: {
  weekStart: Date;
  cameras: TimelineCamera[];
  bookings: TimelineBookingRow[];
  now?: Date;
}) {
  const barsByCamera = layoutTimelineBars(bookings, weekStart);
  const days = Array.from({ length: DAYS_IN_WEEK }, (_, index) => addDays(weekStart, index));
  const todayKey = vnDateKey(now);

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-white">
      <div className="min-w-[60rem]">
        <div className="grid bg-accent text-paper" style={{ gridTemplateColumns: GRID_COLUMNS }}>
          <div className="sticky left-0 z-20 bg-accent p-2 text-sm font-medium">Máy</div>
          {days.map((day, index) => {
            const isToday = vnDateKey(day) === todayKey;
            return (
              <div
                key={index}
                className={`border-l border-paper/30 p-2 text-center text-sm ${
                  isToday ? "bg-ink/30 font-semibold" : ""
                }`}
              >
                {WEEKDAY_LABELS[index]}
                <div className="text-xs opacity-80">{formatDayMonthYear(day)}</div>
              </div>
            );
          })}
        </div>

        {cameras.map((camera, index) => (
          <CameraRow
            key={camera.id}
            camera={camera}
            bars={barsByCamera.get(camera.id)}
            days={days}
            todayKey={todayKey}
            startsModelGroup={index > 0 && cameras[index - 1].cameraModel.name !== camera.cameraModel.name}
            now={now}
          />
        ))}

        {cameras.length === 0 && (
          <p className="p-5 text-sm text-ink/50">
            Chưa có máy nào đang sử dụng.{" "}
            <Link href="/cameras" className="text-accent underline">
              Thêm máy
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

function CameraRow({
  camera,
  bars,
  days,
  todayKey,
  startsModelGroup,
  now,
}: {
  camera: TimelineCamera;
  bars: Bar[] | undefined;
  days: Date[];
  todayKey: string;
  startsModelGroup: boolean;
  now: Date;
}) {
  const lanes = countLanes(bars);
  const maintenance = camera.status === "MAINTENANCE";
  const rowSpan = `1 / span ${lanes}`;

  return (
    <div
      className={`grid border-b border-line ${startsModelGroup ? "border-t-2 border-t-ink/40" : ""}`}
      style={{
        gridTemplateColumns: GRID_COLUMNS,
        gridTemplateRows: `repeat(${lanes}, minmax(2.25rem, auto))`,
      }}
    >
      <div
        className={`sticky left-0 z-10 flex flex-col justify-center border-r border-line p-2 text-sm ${
          maintenance ? MAINTENANCE_TINT : "bg-white"
        }`}
        style={{ gridColumn: 1, gridRow: rowSpan }}
      >
        <span className="font-semibold">{camera.cameraModel.name}</span>
        <span className="text-xs text-ink/55">
          {camera.assetCode}
          {maintenance && " · Bảo trì"}
        </span>
      </div>

      {days.map((day, index) => (
        <div
          key={index}
          className={`border-l border-line ${
            maintenance ? MAINTENANCE_TINT : vnDateKey(day) === todayKey ? "bg-accent/5" : ""
          }`}
          style={{ gridColumn: index + 2, gridRow: rowSpan }}
        />
      ))}

      {bars?.map((bar) => (
        <BookingBar key={`${bar.booking.order.id}-${bar.lane}`} bar={bar} now={now} />
      ))}
    </div>
  );
}

function BookingBar({ bar, now }: { bar: Bar; now: Date }) {
  const { booking, startCol, span, lane, continuesBefore, continuesAfter } = bar;
  const { order } = booking;
  const tone = pickTone(order.status, booking.returnDueAt, now);
  const style = RENTAL_TIMELINE_STYLE[tone];

  return (
    <Link
      href={`/orders/${order.id}`}
      title={buildTooltip(booking, style.label)}
      className={`z-10 m-0.5 flex items-center overflow-hidden border px-2 py-1 text-xs hover:brightness-95 ${
        style.className
      } ${continuesBefore ? "rounded-l-none border-l-0" : "rounded-l"} ${
        continuesAfter ? "rounded-r-none border-r-0" : "rounded-r"
      }`}
      style={{ gridColumn: `${startCol + 1} / span ${span}`, gridRow: lane + 1 }}
    >
      <span className="truncate">
        {continuesBefore && "◀ "}
        {buildLabel(booking)}
        {continuesAfter && " ▶"}
      </span>
    </Link>
  );
}

function pickTone(
  status: TimelineBookingRow["order"]["status"],
  returnDueAt: Date,
  now: Date
): RentalTimelineTone {
  if (status === "RENTING" && returnDueAt.getTime() < now.getTime()) return "OVERDUE";
  return status in RENTAL_TIMELINE_STYLE ? (status as RentalTimelineTone) : "COMPLETED";
}

function buildLabel({ order }: TimelineBookingRow): string {
  const { customer, notes } = order;
  const name = customer.contactChannel ? `${customer.name} (${customer.contactChannel})` : customer.name;
  return notes ? `${name} · ${notes}` : name;
}

function buildTooltip(booking: TimelineBookingRow, toneLabel: string): string {
  const { order } = booking;
  return [
    `${order.orderCode} — ${ORDER_STATUS_LABEL[order.status]}${toneLabel === "Trễ hạn trả" ? " (trễ hạn trả)" : ""}`,
    buildLabel(booking),
    `Nhận: ${formatVnDateTime(booking.start)}`,
    `Hạn trả: ${formatVnDateTime(booking.returnDueAt)}`,
    booking.start.getTime() !== booking.end.getTime() && booking.end.getTime() !== booking.returnDueAt.getTime()
      ? `Đã trả: ${formatVnDateTime(booking.end)}`
      : null,
    `${booking.rentalDays} ngày`,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatDayMonthYear(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    timeZone: VN_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
