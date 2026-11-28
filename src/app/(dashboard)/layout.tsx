import { requireSession, logout } from "@/server/auth";
import { NavLink } from "@/components/nav-link";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "Đơn hàng", href: "/orders" },
  { label: "Máy ảnh", href: "/cameras" },
  { label: "Kho phim", href: "/film" },
  { label: "Khách hàng", href: "/customers" },
  { label: "Tài chính", href: "#", ready: false },
  { label: "Cài đặt", href: "/settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-side p-4 md:sticky md:pt-7 md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:justify-between md:overflow-y-auto">
        <div>
          <p className="mb-5 px-3 font-logo text-4xl leading-none text-white">PolaGift</p>
          <nav className="flex gap-1 overflow-x-auto md:block md:space-y-1">
            {NAV_ITEMS.map((item) =>
              item.ready === false ? (
                <span
                  key={item.label}
                  className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm text-white/30"
                  title="Sẽ có ở giai đoạn tiếp theo"
                >
                  {item.label}
                </span>
              ) : (
                <NavLink key={item.label} href={item.href}>
                  {item.label}
                </NavLink>
              )
            )}
          </nav>
        </div>
        <div className="mt-3 border-t border-white/15 pt-3">
          <p className="px-3 text-xs text-white/60">{session.displayName}</p>
          <form action={logout}>
            <button className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white">
              Đăng xuất
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
