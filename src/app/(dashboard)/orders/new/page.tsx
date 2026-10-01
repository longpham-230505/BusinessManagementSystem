import Link from "next/link";

const ORDER_TYPES = [
  {
    href: "/orders/new/rental",
    title: "Thuê máy",
    description: "Chọn máy, thời gian thuê và cơ sở giao máy.",
  },
  {
    href: "/orders/new/film-sale",
    title: "Bán phim",
    description: "Bán nhiều loại phim; tự trừ kho theo FIFO và tính giá vốn.",
  },
  {
    href: "/orders/new/photo-print",
    title: "In ảnh",
    description: "Các dịch vụ in, có thể kèm phim của cửa hàng dùng để in.",
  },
];

export default function ChooseOrderTypePage() {
  return (
    <div className="max-w-4xl space-y-5">
      <header>
        <Link href="/orders" className="text-sm text-accent underline">
          ← Đơn hàng
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Tạo đơn mới</h1>
        <p className="mt-1 text-sm text-ink/60">Chọn loại đơn muốn tạo.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {ORDER_TYPES.map((type) => (
          <Link
            key={type.href}
            href={type.href}
            className="rounded-lg border border-line bg-white p-5 shadow-sm hover:border-accent"
          >
            <h2 className="font-medium">{type.title}</h2>
            <p className="mt-2 text-sm text-ink/60">{type.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
