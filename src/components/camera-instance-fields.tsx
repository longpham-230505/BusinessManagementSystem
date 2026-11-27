import type { Branch, CameraInstance, CameraModel } from "@prisma/client";
import { CheckboxField, Field, SelectField } from "@/components/form-fields";
import { CAMERA_STATUS_LABEL } from "@/lib/labels";

/**
 * Các trường của một máy ảnh vật lý — dùng chung cho form thêm máy và form sửa máy
 * (khi sửa, truyền `camera` để điền sẵn giá trị hiện tại).
 */
export function CameraInstanceFields({
  models,
  branches,
  camera,
}: {
  models: CameraModel[];
  branches: Branch[];
  camera?: CameraInstance;
}) {
  return (
    <>
      <SelectField name="cameraModelId" label="Model" required defaultValue={camera?.cameraModelId}>
        <option value="">Chọn model</option>
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </SelectField>
      <SelectField name="branchId" label="Cơ sở" required defaultValue={camera?.branchId}>
        <option value="">Chọn cơ sở</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </SelectField>
      <Field name="assetCode" label="Mã máy" required defaultValue={camera?.assetCode} />

      <Field
        name="price1day"
        label="Giá thuê 1 ngày"
        type="number"
        required
        defaultValue={camera?.price1day.toString()}
      />
      <Field
        name="priceCombo3"
        label="Giá combo 3 ngày"
        type="number"
        required
        defaultValue={camera?.priceCombo3.toString()}
      />
      <Field
        name="filmRemaining"
        label="Phim còn trong máy"
        type="number"
        required
        defaultValue={camera?.filmRemaining ?? 0}
      />

      <SelectField name="status" label="Trạng thái" defaultValue={camera?.status}>
        {Object.entries(CAMERA_STATUS_LABEL).map(([status, label]) => (
          <option key={status} value={status}>
            {label}
          </option>
        ))}
      </SelectField>
      <Field
        name="purchaseCost"
        label="Giá mua"
        type="number"
        defaultValue={camera?.purchaseCost?.toString()}
      />
      <Field
        name="purchaseDate"
        label="Ngày mua"
        type="date"
        defaultValue={camera?.purchaseDate?.toISOString().slice(0, 10)}
      />

      <Field
        name="notes"
        label="Ghi chú"
        className="md:col-span-2"
        defaultValue={camera?.notes ?? undefined}
      />
      <div className="flex items-end pb-2">
        <CheckboxField name="active" label="Đang sử dụng" defaultChecked={camera?.active ?? true} />
      </div>
    </>
  );
}
