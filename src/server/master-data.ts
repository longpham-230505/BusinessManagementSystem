"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CameraInstanceStatus, TransactionType } from "@prisma/client";
import { prisma } from "@/server/db";

type Entity =
  | "branch"
  | "cameraModel"
  | "cameraInstance"
  | "filmType"
  | "printService"
  | "transactionCategory"
  | "customer";

function text(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value || null;
}

function required(formData: FormData, name: string, label: string) {
  const value = text(formData, name);
  if (!value) throw new Error(`${label} là bắt buộc.`);
  return value;
}

function money(formData: FormData, name: string, label: string, optional = false) {
  const value = text(formData, name);
  if (!value && optional) return null;
  const parsed = Number(value?.replace(/[^0-9-]/g, ""));
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${label} phải là số tiền không âm, không có số lẻ.`);
  }
  return parsed;
}

function requiredMoney(formData: FormData, name: string, label: string) {
  const value = money(formData, name, label);
  if (value === null) throw new Error(`${label} là bắt buộc.`);
  return value;
}

function integer(formData: FormData, name: string, label: string) {
  const parsed = Number(text(formData, name));
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${label} phải là số nguyên không âm.`);
  return parsed;
}

function active(formData: FormData) {
  return formData.get("active") === "on";
}

function destination(entity: Entity) {
  if (entity === "cameraInstance") return "/cameras";
  if (entity === "customer") return "/customers";
  return "/settings";
}

export async function saveMasterData(formData: FormData) {
  const entity = required(formData, "entity", "Loại dữ liệu") as Entity;
  const id = text(formData, "id");
  const path = destination(entity);

  try {
    if (entity === "branch") {
      const data = { name: required(formData, "name", "Tên cơ sở"), address: text(formData, "address"), notes: text(formData, "notes") };
      if (id) await prisma.branch.update({ where: { id }, data }); else await prisma.branch.create({ data });
    } else if (entity === "cameraModel") {
      const data = {
        name: required(formData, "name", "Tên model"), description: text(formData, "description"),
        defaultBookingDeposit: requiredMoney(formData, "defaultBookingDeposit", "Cọc giữ chỗ"),
        defaultPrice1day: money(formData, "defaultPrice1day", "Giá thuê 1 ngày", true),
        defaultPriceCombo3: money(formData, "defaultPriceCombo3", "Giá combo 3 ngày", true), active: active(formData),
      };
      if (id) await prisma.cameraModel.update({ where: { id }, data }); else await prisma.cameraModel.create({ data });
    } else if (entity === "cameraInstance") {
      const status = required(formData, "status", "Trạng thái") as CameraInstanceStatus;
      const data = {
        cameraModelId: required(formData, "cameraModelId", "Model máy"), branchId: required(formData, "branchId", "Cơ sở"),
        assetCode: required(formData, "assetCode", "Mã máy"), price1day: requiredMoney(formData, "price1day", "Giá thuê 1 ngày"),
        priceCombo3: requiredMoney(formData, "priceCombo3", "Giá combo 3 ngày"), filmRemaining: integer(formData, "filmRemaining", "Số phim còn lại"),
        status, purchaseCost: money(formData, "purchaseCost", "Giá mua", true),
        purchaseDate: text(formData, "purchaseDate") ? new Date(`${text(formData, "purchaseDate")}T00:00:00.000Z`) : null,
        notes: text(formData, "notes"), active: active(formData),
      };
      if (id) await prisma.cameraInstance.update({ where: { id }, data }); else await prisma.cameraInstance.create({ data });
    } else if (entity === "filmType") {
      const data = { name: required(formData, "name", "Tên loại phim"), defaultSalePrice: requiredMoney(formData, "defaultSalePrice", "Giá bán mặc định"), active: active(formData) };
      if (id) await prisma.filmType.update({ where: { id }, data }); else await prisma.filmType.create({ data });
    } else if (entity === "printService") {
      const data = { name: required(formData, "name", "Tên dịch vụ"), unitPrice: requiredMoney(formData, "unitPrice", "Đơn giá"), active: active(formData) };
      if (id) await prisma.printService.update({ where: { id }, data }); else await prisma.printService.create({ data });
    } else if (entity === "transactionCategory") {
      const transactionType = required(formData, "transactionType", "Loại giao dịch") as TransactionType;
      const data = { name: required(formData, "name", "Tên danh mục"), transactionType, active: active(formData) };
      if (id) await prisma.transactionCategory.update({ where: { id }, data }); else await prisma.transactionCategory.create({ data });
    } else if (entity === "customer") {
      const data = { name: required(formData, "name", "Tên khách hàng"), phone: text(formData, "phone"), contactChannel: text(formData, "contactChannel"), contactHandle: text(formData, "contactHandle"), isFlagged: formData.get("isFlagged") === "on", notes: text(formData, "notes") };
      if (id) await prisma.customer.update({ where: { id }, data }); else await prisma.customer.create({ data });
    } else {
      throw new Error("Loại dữ liệu không hợp lệ.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể lưu dữ liệu.";
    redirect(`${path}?error=${encodeURIComponent(message.includes("Unique constraint") ? "Dữ liệu trùng với bản ghi đang hoạt động." : message)}`);
  }
  revalidatePath(path);
  redirect(`${path}?notice=${encodeURIComponent(id ? "Đã cập nhật dữ liệu." : "Đã tạo dữ liệu mới.")}`);
}

export async function setMasterDataDeleted(formData: FormData) {
  const entity = required(formData, "entity", "Loại dữ liệu") as Entity;
  const id = required(formData, "id", "Bản ghi");
  const restore = formData.get("restore") === "true";
  const deletedAt = restore ? null : new Date();
  const path = destination(entity);
  if (entity === "branch") await prisma.branch.update({ where: { id }, data: { deletedAt } });
  else if (entity === "cameraModel") await prisma.cameraModel.update({ where: { id }, data: { deletedAt } });
  else if (entity === "cameraInstance") await prisma.cameraInstance.update({ where: { id }, data: { deletedAt } });
  else if (entity === "filmType") await prisma.filmType.update({ where: { id }, data: { deletedAt } });
  else if (entity === "printService") await prisma.printService.update({ where: { id }, data: { deletedAt } });
  else if (entity === "customer") await prisma.customer.update({ where: { id }, data: { deletedAt } });
  else if (entity === "transactionCategory") await prisma.transactionCategory.update({ where: { id }, data: { active: restore } });
  revalidatePath(path);
  redirect(`${path}?notice=${encodeURIComponent(restore ? "Đã khôi phục dữ liệu." : "Đã xóa mềm dữ liệu.")}`);
}
