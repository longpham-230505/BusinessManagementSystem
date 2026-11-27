import type {
  Branch,
  CameraModel,
  FilmType,
  PrintService,
  TransactionCategory,
} from "@prisma/client";
import { CheckboxField, Field, SelectField } from "@/components/form-fields";

/**
 * Các trường của từng loại dữ liệu nền trong Cài đặt. Mỗi component dùng chung cho
 * form thêm mới (không truyền bản ghi) và form sửa (truyền bản ghi để điền sẵn).
 */

const DEFAULT_BOOKING_DEPOSIT = 40000;

function ActiveCheckbox({ active = true }: { active?: boolean }) {
  return <CheckboxField name="active" label="Đang sử dụng" defaultChecked={active} />;
}

export function BranchFields({ branch }: { branch?: Branch }) {
  return (
    <>
      <Field name="name" label="Tên cơ sở" required defaultValue={branch?.name} />
      <Field name="address" label="Địa chỉ" defaultValue={branch?.address ?? undefined} />
      <Field name="notes" label="Ghi chú" defaultValue={branch?.notes ?? undefined} />
    </>
  );
}

export function CameraModelFields({ model }: { model?: CameraModel }) {
  return (
    <>
      <Field name="name" label="Tên model" required defaultValue={model?.name} />
      <Field
        name="defaultBookingDeposit"
        label="Cọc giữ chỗ mặc định"
        type="number"
        required
        defaultValue={model?.defaultBookingDeposit.toString() ?? DEFAULT_BOOKING_DEPOSIT}
      />
      <Field
        name="defaultPrice1day"
        label="Giá thuê 1 ngày mặc định"
        type="number"
        defaultValue={model?.defaultPrice1day?.toString()}
      />
      <Field
        name="defaultPriceCombo3"
        label="Giá combo 3 ngày mặc định"
        type="number"
        defaultValue={model?.defaultPriceCombo3?.toString()}
      />
      <Field name="description" label="Mô tả" defaultValue={model?.description ?? undefined} />
      <ActiveCheckbox active={model?.active} />
    </>
  );
}

export function FilmTypeFields({ filmType }: { filmType?: FilmType }) {
  return (
    <>
      <Field name="name" label="Tên loại phim" required defaultValue={filmType?.name} />
      <Field
        name="defaultSalePrice"
        label="Giá bán mặc định"
        type="number"
        required
        defaultValue={filmType?.defaultSalePrice.toString()}
      />
      <ActiveCheckbox active={filmType?.active} />
    </>
  );
}

export function PrintServiceFields({ service }: { service?: PrintService }) {
  return (
    <>
      <Field name="name" label="Tên dịch vụ" required defaultValue={service?.name} />
      <Field
        name="unitPrice"
        label="Đơn giá"
        type="number"
        required
        defaultValue={service?.unitPrice.toString()}
      />
      <ActiveCheckbox active={service?.active} />
    </>
  );
}

export function TransactionCategoryFields({ category }: { category?: TransactionCategory }) {
  return (
    <>
      <Field name="name" label="Tên danh mục" required defaultValue={category?.name} />
      <SelectField name="transactionType" label="Loại" defaultValue={category?.transactionType}>
        <option value="EXPENSE">Chi phí</option>
        <option value="INCOME">Thu nhập khác</option>
      </SelectField>
      <ActiveCheckbox active={category?.active} />
    </>
  );
}
