import type {
  Branch,
  CameraModel,
  FilmType,
  PrintService,
  TransactionCategory,
} from "@prisma/client";
import { prisma } from "@/server/db";

/** Các truy vấn đọc dữ liệu nền cho trang Cài đặt, Máy ảnh và Khách hàng. */

const byName = { name: "asc" } as const;
const notDeleted = { deletedAt: null } as const;

export const listBranches = () =>
  prisma.branch.findMany({ where: notDeleted, orderBy: byName });

export const listCameraModels = ({ activeOnly = false } = {}) =>
  prisma.cameraModel.findMany({
    where: { ...notDeleted, ...(activeOnly ? { active: true } : {}) },
    orderBy: byName,
  });

export const listCameraInstances = () =>
  prisma.cameraInstance.findMany({
    where: notDeleted,
    include: { cameraModel: true, branch: true },
    orderBy: { assetCode: "asc" },
  });

export const listFilmTypes = () =>
  prisma.filmType.findMany({ where: notDeleted, orderBy: byName });

export const listPrintServices = () =>
  prisma.printService.findMany({ where: notDeleted, orderBy: byName });

export const listTransactionCategories = () =>
  prisma.transactionCategory.findMany({ orderBy: byName });

export const listCustomers = () =>
  prisma.customer.findMany({ where: notDeleted, orderBy: byName });

/** Tra cứu một bản ghi theo id để điền sẵn form sửa; null nếu không tồn tại hoặc đã xóa. */
export const findCameraInstance = (id: string) =>
  prisma.cameraInstance.findFirst({ where: { id, ...notDeleted } });

export const findCustomer = (id: string) =>
  prisma.customer.findFirst({ where: { id, ...notDeleted } });

/** Các loại dữ liệu nền sửa được trong trang Cài đặt. */
export const SETTINGS_ENTITIES = [
  "branch",
  "cameraModel",
  "filmType",
  "printService",
  "transactionCategory",
] as const;

export type SettingsEntityName = (typeof SETTINGS_ENTITIES)[number];

export const isSettingsEntity = (name: string): name is SettingsEntityName =>
  (SETTINGS_ENTITIES as readonly string[]).includes(name);

/** Bản ghi kèm tên loại, để trang sửa biết phải vẽ form nào. */
export type SettingsRecord =
  | { entity: "branch"; record: Branch }
  | { entity: "cameraModel"; record: CameraModel }
  | { entity: "filmType"; record: FilmType }
  | { entity: "printService"; record: PrintService }
  | { entity: "transactionCategory"; record: TransactionCategory };

export async function findSettingsRecord(
  entity: SettingsEntityName,
  id: string
): Promise<SettingsRecord | null> {
  switch (entity) {
    case "branch": {
      const record = await prisma.branch.findFirst({ where: { id, ...notDeleted } });
      return record && { entity, record };
    }
    case "cameraModel": {
      const record = await prisma.cameraModel.findFirst({
        where: { id, ...notDeleted },
      });
      return record && { entity, record };
    }
    case "filmType": {
      const record = await prisma.filmType.findFirst({ where: { id, ...notDeleted } });
      return record && { entity, record };
    }
    case "printService": {
      const record = await prisma.printService.findFirst({
        where: { id, ...notDeleted },
      });
      return record && { entity, record };
    }
    case "transactionCategory": {
      // Danh mục tài chính không có `deleted_at`.
      const record = await prisma.transactionCategory.findUnique({ where: { id } });
      return record && { entity, record };
    }
  }
}
