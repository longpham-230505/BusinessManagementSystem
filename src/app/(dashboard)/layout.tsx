import Link from "next/link";
import { requireSession, logout } from "@/server/auth";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "Đơn hàng", href: "/orders" },
  { label: "Máy ảnh", href: "/cameras" },
  { label: "Phim", href: "#", ready: false },
  { label: "Khách hàng", href: "/customers" },
  { label: "Tài chính", href: "#", ready: false },
  { label: "Cài đặt", href: "/settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-line bg-white p-4 md:flex md:min-h-screen md:w-56 md:flex-col md:justify-between md:border-b-0 md:border-r">
        <div>
          <p className="mb-4 px-2 text-sm font-semibold tracking-tight">ABMS</p>
          <nav className="flex gap-1 overflow-x-auto md:block md:space-y-1">
            {NAV_ITEMS.map((item) =>
              item.ready === false ? (
                <span
                  key={item.label}
                  className="whitespace-nowrap rounded-md px-2 py-1.5 text-sm text-ink/35"
                  title="Sẽ có ở giai đoạn tiếp theo"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="block whitespace-nowrap rounded-md px-2 py-1.5 text-sm text-ink/70 hover:bg-accent/10 hover:text-accent"
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
        </div>
        <div className="mt-3 border-t border-line pt-3">
          <p className="px-2 text-xs text-ink/50">{session.displayName}</p>
          <form action={logout}>
            <button className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-sm text-ink/60 hover:bg-ink/5">
              Đăng xuất
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
