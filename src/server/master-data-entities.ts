import { CameraInstanceStatus, TransactionType } from "@prisma/client";
import type { FormReader } from "@/lib/form-reader";
import { prisma } from "@/server/db";

/**
 * Danh sách các loại dữ liệu nền (master data) và cách lưu / xóa mềm từng loại.
 * Muốn thêm một loại mới: khai báo một entry trong `MASTER_DATA_ENTITIES`,
 * không cần sửa Server Action.
 */

export type MasterDataEntity = {
  /** Trang hiển thị lại sau khi lưu hoặc xóa. */
  redirectTo: string;
  /** Tạo mới (id = null) hoặc cập nhật bản ghi từ dữ liệu form. */
  save(id: string | null, form: FormReader): Promise<unknown>;
  /** Xóa mềm hoặc khôi phục (restore = true) một bản ghi. */
  setDeleted(id: string, restore: boolean): Promise<unknown>;
};

const SETTINGS_PATH = "/settings";

/** Giá trị cột `deleted_at`: null khi khôi phục, thời điểm hiện tại khi xóa mềm. */
const deletedAtValue = (restore: boolean) => (restore ? null : new Date());

const branch: MasterDataEntity = {
  redirectTo: SETTINGS_PATH,
  save(id, form) {
    const data = {
      name: form.requiredText("name", "Tên cơ sở"),
      address: form.text("address"),
      notes: form.text("notes"),
    };
    return id
      ? prisma.branch.update({ where: { id }, data })
      : prisma.branch.create({ data });
  },
  setDeleted: (id, restore) =>
    prisma.branch.update({
      where: { id },
      data: { deletedAt: deletedAtValue(restore) },
    }),
};

const cameraModel: MasterDataEntity = {
  redirectTo: SETTINGS_PATH,
  save(id, form) {
    const data = {
      name: form.requiredText("name", "Tên model"),
      description: form.text("description"),
      defaultBookingDeposit: form.requiredVnd(
        "defaultBookingDeposit",
        "Cọc giữ chỗ"
      ),
      defaultPrice1day: form.vnd("defaultPrice1day", "Giá thuê 1 ngày"),
      defaultPriceCombo3: form.vnd("defaultPriceCombo3", "Giá combo 3 ngày"),
      active: form.checkbox("active"),
    };
    return id
      ? prisma.cameraModel.update({ where: { id }, data })
      : prisma.cameraModel.create({ data });
  },
  setDeleted: (id, restore) =>
    prisma.cameraModel.update({
      where: { id },
      data: { deletedAt: deletedAtValue(restore) },
    }),
};

const cameraInstance: MasterDataEntity = {
  redirectTo: "/cameras",
  save(id, form) {
    const data = {
      cameraModelId: form.requiredText("cameraModelId", "Model máy"),
      branchId: form.requiredText("branchId", "Cơ sở"),
      assetCode: form.requiredText("assetCode", "Mã máy"),
      price1day: form.requiredVnd("price1day", "Giá thuê 1 ngày"),
      priceCombo3: form.requiredVnd("priceCombo3", "Giá combo 3 ngày"),
      filmRemaining: form.nonNegativeInt("filmRemaining", "Số phim còn lại"),
      status: form.oneOf(
        "status",
        "Trạng thái",
        Object.values(CameraInstanceStatus)
      ),
      purchaseCost: form.vnd("purchaseCost", "Giá mua"),
      purchaseDate: form.date("purchaseDate", "Ngày mua"),
      notes: form.text("notes"),
      active: form.checkbox("active"),
    };
    return id
      ? prisma.cameraInstance.update({ where: { id }, data })
      : prisma.cameraInstance.create({ data });
  },
  setDeleted: (id, restore) =>
    prisma.cameraInstance.update({
      where: { id },
      data: { deletedAt: deletedAtValue(restore) },
    }),
};

const filmType: MasterDataEntity = {
  redirectTo: SETTINGS_PATH,
  save(id, form) {
    const data = {
      name: form.requiredText("name", "Tên loại phim"),
      defaultSalePrice: form.requiredVnd(
        "defaultSalePrice",
        "Giá bán mặc định"
      ),
      active: form.checkbox("active"),
    };
    return id
      ? prisma.filmType.update({ where: { id }, data })
      : prisma.filmType.create({ data });
  },
  setDeleted: (id, restore) =>
    prisma.filmType.update({
      where: { id },
      data: { deletedAt: deletedAtValue(restore) },
    }),
};

const printService: MasterDataEntity = {
  redirectTo: SETTINGS_PATH,
  save(id, form) {
    const data = {
      name: form.requiredText("name", "Tên dịch vụ"),
      unitPrice: form.requiredVnd("unitPrice", "Đơn giá"),
      active: form.checkbox("active"),
    };
    return id
      ? prisma.printService.update({ where: { id }, data })
      : prisma.printService.create({ data });
  },
  setDeleted: (id, restore) =>
    prisma.printService.update({
      where: { id },
      data: { deletedAt: deletedAtValue(restore) },
    }),
};

const transactionCategory: MasterDataEntity = {
  redirectTo: SETTINGS_PATH,
  save(id, form) {
    const data = {
      name: form.requiredText("name", "Tên danh mục"),
      transactionType: form.oneOf(
        "transactionType",
        "Loại giao dịch",
        Object.values(TransactionType)
      ),
      active: form.checkbox("active"),
    };
    return id
      ? prisma.transactionCategory.update({ where: { id }, data })
      : prisma.transactionCategory.create({ data });
  },
  // Danh mục tài chính không có `deleted_at`: "xóa" nghĩa là ngưng sử dụng.
  setDeleted: (id, restore) =>
    prisma.transactionCategory.update({
      where: { id },
      data: { active: restore },
    }),
};

const customer: MasterDataEntity = {
  redirectTo: "/customers",
  save(id, form) {
    const data = {
      name: form.requiredText("name", "Tên khách hàng"),
      phone: form.text("phone"),
      contactChannel: form.text("contactChannel"),
      contactHandle: form.text("contactHandle"),
      isFlagged: form.checkbox("isFlagged"),
      notes: form.text("notes"),
    };
    return id
      ? prisma.customer.update({ where: { id }, data })
      : prisma.customer.create({ data });
  },
  setDeleted: (id, restore) =>
    prisma.customer.update({
      where: { id },
      data: { deletedAt: deletedAtValue(restore) },
    }),
};

export const MASTER_DATA_ENTITIES = {
  branch,
  cameraModel,
  cameraInstance,
  filmType,
  printService,
  transactionCategory,
  customer,
} satisfies Record<string, MasterDataEntity>;

export type MasterDataEntityName = keyof typeof MASTER_DATA_ENTITIES;

export function findMasterDataEntity(
  name: string | null
): MasterDataEntity | null {
  if (name !== null && name in MASTER_DATA_ENTITIES) {
    return MASTER_DATA_ENTITIES[name as MasterDataEntityName];
  }
  return null;
}
