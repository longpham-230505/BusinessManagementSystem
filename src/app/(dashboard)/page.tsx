import { requireSession } from "@/server/auth";
import { prisma } from "@/server/db";

export default async function DashboardPage() {
  const session = await requireSession();

  // Kiểm tra kết nối database thật (tiêu chí nghiệm thu Giai đoạn 0
  // trong Implementation Plan) — không hiển thị dữ liệu nghiệp vụ nào,
  // các báo cáo thật sẽ đến ở Giai đoạn 5.
  const userCount = await prisma.user.count();

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-semibold">Chào {session.displayName}</h1>
      <p className="mt-1 text-sm text-ink/60">
        Đây là khung dashboard trống của Giai đoạn 0. Các mục Đơn hàng, Máy ảnh,
        Phim, Khách hàng, Tài chính sẽ được bổ sung ở các giai đoạn tiếp theo
        (xem Implementation Plan, mục 2).
      </p>

      <div className="mt-6 rounded-md border border-line bg-white p-4 text-sm">
        <p className="font-medium">Kết nối database</p>
        <p className="mt-1 text-ink/60">
          OK — hiện có {userCount} tài khoản nội bộ trong hệ thống.
        </p>
      </div>
    </div>
  );
}
