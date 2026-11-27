import { CameraInstanceStatus, OrderStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { BusinessRuleError } from "@/server/errors";
import type { Db } from "@/server/services/types";

/** Dữ liệu chỉnh sửa được của một máy ảnh vật lý. */
export type CameraInstanceData = {
  cameraModelId: string;
  branchId: string;
  assetCode: string;
  price1day: Prisma.Decimal;
  priceCombo3: Prisma.Decimal;
  filmRemaining: number;
  status: CameraInstanceStatus;
  purchaseCost: Prisma.Decimal | null;
  purchaseDate: Date | null;
  notes: string | null;
  active: boolean;
};

/** Các đơn thuê chưa trả máy: máy đang bị chiếm hoặc đã được đặt trước. */
const OPEN_RENTAL_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING_BOOKING_DEPOSIT,
  OrderStatus.BOOKED,
  OrderStatus.RENTING,
];

/**
 * Cập nhật thông tin máy (giá thuê, trạng thái, số phim còn lại, cơ sở...).
 *
 * - Đổi cơ sở sẽ tự ghi CameraMovement (lịch sử chuyển cơ sở), giống khi máy được trả về cơ sở khác.
 * - Giá thuê mới chỉ áp dụng cho đơn tạo sau này; đơn cũ giữ giá đã lưu.
 * - Không cho ngừng sử dụng máy đang có đơn thuê chưa hoàn tất.
 */
export async function updateCameraInstance(
  cameraId: string,
  data: CameraInstanceData,
  at: Date = new Date()
) {
  await prisma.$transaction(async (db) => {
    const current = await db.cameraInstance.findFirst({
      where: { id: cameraId, deletedAt: null },
      select: { branchId: true },
    });
    if (!current) throw new BusinessRuleError("Không tìm thấy máy.");

    if (data.status === CameraInstanceStatus.RETIRED || !data.active) {
      await assertNoOpenRentals(db, cameraId);
    }

    await db.cameraInstance.update({ where: { id: cameraId }, data });

    if (current.branchId !== data.branchId) {
      await db.cameraMovement.create({
        data: {
          cameraInstanceId: cameraId,
          fromBranchId: current.branchId,
          toBranchId: data.branchId,
          movedAt: at,
          notes: "Đổi cơ sở khi chỉnh sửa thông tin máy",
        },
      });
    }
  });
}

async function assertNoOpenRentals(db: Db, cameraId: string) {
  const openItems = await db.rentalItem.findMany({
    where: {
      cameraInstanceId: cameraId,
      isBlocking: true,
      order: { deletedAt: null, status: { in: OPEN_RENTAL_STATUSES } },
    },
    select: { order: { select: { orderCode: true } } },
  });

  if (openItems.length > 0) {
    const codes = openItems.map((item) => item.order.orderCode).join(", ");
    throw new BusinessRuleError(
      `Máy đang có đơn thuê chưa hoàn tất (${codes}). Hãy hủy hoặc hoàn tất các đơn đó trước khi ngừng sử dụng máy.`
    );
  }
}
