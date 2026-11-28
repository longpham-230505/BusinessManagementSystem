import Link from "next/link";
import { addDays, parseWeekParam, VN_TIME_ZONE, vnDateKey } from "@/lib/datetime";
import { RENTAL_TIMELINE_STYLE } from "@/lib/labels";
import { loadCameraTimeline } from "@/server/queries/timeline.queries";
import { CameraTimeline } from "./_components/camera-timeline";

const NAV_BUTTON_CLASS = "rounded border border-line px-3 py-1.5 text-sm hover:bg-ink/5";

const weekHref = (weekStart: Date) => `/?week=${vnDateKey(weekStart)}`;

function formatDayMonth(date: Date, withYear: boolean): string {
  return date.toLocaleDateString("vi-VN", {
    timeZone: VN_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

/** Dashboard: lịch tuần của từng máy ảnh (ai thuê, từ ngày nào đến ngày nào). */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weekStart = parseWeekParam(week);
  const weekEnd = addDays(weekStart, 6);
  const { cameras, bookings } = await loadCameraTimeline(weekStart);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium">
            Lịch tuần {formatDayMonth(weekStart, false)} – {formatDayMonth(weekEnd, true)}
          </h1>
        </div>
        <Link
          href="/orders/new/rental"
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-paper"
        >
          Tạo đơn thuê
        </Link>
      </header>

      <nav className="flex flex-wrap items-center gap-2">
        <Link href={weekHref(addDays(weekStart, -7))} className={NAV_BUTTON_CLASS}>
          ← Tuần trước
        </Link>
        <Link href="/" className={NAV_BUTTON_CLASS}>
          Hôm nay
        </Link>
        <Link href={weekHref(addDays(weekStart, 7))} className={NAV_BUTTON_CLASS}>
          Tuần sau →
        </Link>
        <form method="get" className="flex items-center gap-2 sm:ml-3">
          <input
            type="date"
            name="week"
            defaultValue={vnDateKey(weekStart)}
            className="rounded border border-line px-2 py-1.5 text-sm"
          />
          <button className={NAV_BUTTON_CLASS}>Đến ngày</button>
        </form>
      </nav>

      <Legend />

      <CameraTimeline weekStart={weekStart} cameras={cameras} bookings={bookings} />
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-2 text-xs">
      {Object.values(RENTAL_TIMELINE_STYLE).map((style) => (
        <li key={style.label} className={`rounded border px-2 py-0.5 ${style.className}`}>
          {style.label}
        </li>
      ))}
      <li className="rounded border border-yellow-300 bg-yellow-50 px-2 py-0.5 text-yellow-900">
        Máy đang bảo trì
      </li>
    </ul>
  );
}
