import { requireSession, logout } from "@/server/auth";

const NAV_ITEMS = [
  { label: "Dashboard", ready: true },
  { label: "Đơn hàng", ready: false },
  { label: "Máy ảnh", ready: false },
  { label: "Phim", ready: false },
  { label: "Khách hàng", ready: false },
  { label: "Tài chính", ready: false },
  { label: "Cài đặt", ready: false },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col justify-between border-r border-line bg-white p-4">
        <div>
          <p className="mb-6 px-2 text-sm font-semibold tracking-tight">ABMS</p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className={
                  "rounded-md px-2 py-1.5 text-sm " +
                  (item.ready
                    ? "bg-accent/10 font-medium text-accent"
                    : "text-ink/35")
                }
                title={item.ready ? undefined : "Sẽ có ở giai đoạn tiếp theo"}
              >
                {item.label}
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-line pt-3">
          <p className="px-2 text-xs text-ink/50">{session.displayName}</p>
          <form action={logout}>
            <button
              type="submit"
              className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-sm text-ink/60 hover:bg-ink/5"
            >
              Đăng xuất
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
