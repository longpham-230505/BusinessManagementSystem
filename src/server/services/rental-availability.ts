import type { Prisma } from "@prisma/client";
import { BusinessRuleError } from "@/server/errors";
import type { Db } from "@/server/services/types";

export type RentalPeriod = { pickupAt: Date; returnDueAt: Date };

export type RentableCamera = {
  id: string;
  price1day: Prisma.Decimal;
  priceCombo3: Prisma.Decimal;
};

/**
 * Kiểm tra các máy có cho thuê được trong khoảng thời gian `period` hay không
 * và trả về giá thuê của từng máy.
 *
 * Đây là lớp kiểm tra để có thông báo dễ hiểu. Chốt chặn cuối cùng chống double
 * booking là exclusion constraint `no_double_booking` ở database (xử lý cả trường
 * hợp hai người tạo đơn cùng lúc).
 */
export async function loadRentableCameras(
  db: Db,
  cameraIds: string[],
  period: RentalPeriod
): Promise<RentableCamera[]> {
  const cameras = await db.cameraInstance.findMany({
    where: { id: { in: cameraIds }, deletedAt: null },
    select: {
      id: true,
      assetCode: true,
      status: true,
      active: true,
      price1day: true,
      priceCombo3: true,
    },
  });

  if (cameras.length !== cameraIds.length) {
    throw new BusinessRuleError("Một hoặc nhiều máy không còn tồn tại.");
  }

  const unusable = cameras.find(
    (camera) => camera.status === "RETIRED" || !camera.active
  );
  if (unusable) {
    throw new BusinessRuleError(
      `Máy ${unusable.assetCode} đã ngừng sử dụng và không thể cho thuê.`
    );
  }

  const conflictingCodes = await findConflictingAssetCodes(
    db,
    cameraIds,
    period
  );
  if (conflictingCodes.length > 0) {
    throw new BusinessRuleError(
      `Máy ${conflictingCodes.join(", ")} đã có lịch thuê trùng thời gian.`
    );
  }

  return cameras;
}

/**
 * Mã các máy đang có đơn thuê (còn hiệu lực) chồng lấn với `period`.
 * Đơn đã trả máy tính đến `returnedAt`, chưa trả thì tính đến `returnDueAt`.
 */
async function findConflictingAssetCodes(
  db: Db,
  cameraIds: string[],
  { pickupAt, returnDueAt }: RentalPeriod
): Promise<string[]> {
  const overlappingItems = await db.rentalItem.findMany({
    where: {
      cameraInstanceId: { in: cameraIds },
      isBlocking: true,
      order: {
        rentalDetail: {
          pickupAt: { lt: returnDueAt },
          OR: [
            { returnedAt: { gt: pickupAt } },
            { returnedAt: null, returnDueAt: { gt: pickupAt } },
          ],
        },
      },
    },
    select: { cameraInstance: { select: { assetCode: true } } },
  });

  return overlappingItems.map((item) => item.cameraInstance.assetCode);
}
