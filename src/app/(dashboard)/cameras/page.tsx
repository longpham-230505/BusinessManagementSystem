import Link from "next/link";
import {
  FlashMessages,
  type FlashSearchParams,
} from "@/components/flash-messages";
import {
  CheckboxField,
  Field,
  SelectField,
  SoftDeleteForm,
  SubmitButton,
  TABLE_WRAPPER_CLASS,
} from "@/components/form-fields";
import { CAMERA_STATUS_LABEL } from "@/lib/labels";
import { formatVnd } from "@/lib/money";
import { saveMasterData } from "@/server/master-data";
import {
  listBranches,
  listCameraInstances,
  listCameraModels,
} from "@/server/queries/master-data.queries";

export default async function CamerasPage({
  searchParams,
}: {
  searchParams: Promise<FlashSearchParams>;
}) {
  const [models, branches, cameras, flash] = await Promise.all([
    listCameraModels({ activeOnly: true }),
    listBranches(),
    listCameraInstances(),
    searchParams,
  ]);

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Máy ảnh</h1>
        <p className="mt-1 text-sm text-ink/60">
          Tạo tài sản vật lý; giá thuê được lưu riêng cho từng máy.
        </p>
      </header>

      <FlashMessages {...flash} />

      <form
        action={saveMasterData}
        className="grid gap-3 rounded-lg border border-line bg-white p-5 shadow-sm md:grid-cols-3"
      >
        <input type="hidden" name="entity" value="cameraInstance" />

        <SelectField name="cameraModelId" label="Model" required>
          <option value="">Chọn model</option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </SelectField>
        <SelectField name="branchId" label="Cơ sở" required>
          <option value="">Chọn cơ sở</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </SelectField>
        <Field name="assetCode" label="Mã máy" required />

        <Field
          name="price1day"
          label="Giá thuê 1 ngày"
          type="number"
          required
        />
        <Field
          name="priceCombo3"
          label="Giá combo 3 ngày"
          type="number"
          required
        />
        <Field
          name="filmRemaining"
          label="Phim còn trong máy"
          type="number"
          defaultValue={0}
          required
        />

        <SelectField name="status" label="Trạng thái">
          {Object.entries(CAMERA_STATUS_LABEL).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </SelectField>
        <Field name="purchaseCost" label="Giá mua" type="number" />
        <Field name="purchaseDate" label="Ngày mua" type="date" />

        <Field name="notes" label="Ghi chú" className="md:col-span-2" />
        <div className="flex items-end pb-2">
          <CheckboxField name="active" label="Đang sử dụng" defaultChecked />
        </div>

        <SubmitButton className="md:col-span-3">Thêm máy</SubmitButton>
      </form>

      <div className={TABLE_WRAPPER_CLASS}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-ink/5 text-ink/70">
            <tr>
              <th className="p-3">Mã máy</th>
              <th className="p-3">Model / Cơ sở</th>
              <th className="p-3">Giá thuê</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {cameras.map((camera) => (
              <tr key={camera.id} className="border-b border-line">
                <td className="p-3 font-medium">{camera.assetCode}</td>
                <td className="p-3">
                  {camera.cameraModel.name}
                  <br />
                  <span className="text-ink/55">{camera.branch.name}</span>
                </td>
                <td className="p-3">
                  {formatVnd(camera.price1day)} / ngày
                  <br />
                  {formatVnd(camera.priceCombo3)} / 3 ngày
                </td>
                <td className="p-3">{CAMERA_STATUS_LABEL[camera.status]}</td>
                <td className="p-3">
                  <SoftDeleteForm entity="cameraInstance" id={camera.id} />
                </td>
              </tr>
            ))}
            {cameras.length === 0 && (
              <tr>
                <td colSpan={5} className="p-5 text-ink/50">
                  Chưa có máy. Hãy{" "}
                  <Link href="/settings" className="text-accent underline">
                    tạo model và cơ sở
                  </Link>{" "}
                  trước.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
