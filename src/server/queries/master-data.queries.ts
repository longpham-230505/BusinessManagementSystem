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
