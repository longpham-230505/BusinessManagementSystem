import Link from "next/link";
import {
  FlashMessages,
  type FlashSearchParams,
} from "@/components/flash-messages";
import { CameraInstanceFields } from "@/components/camera-instance-fields";
import {
  RowActions,
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
          Tạo và chỉnh sửa tài sản vật lý; giá thuê và số phim còn lại được lưu riêng cho từng máy.
        </p>
      </header>

      <FlashMessages {...flash} />

      <form
        action={saveMasterData}
        className="grid gap-3 rounded-lg border border-line bg-white p-5 shadow-sm md:grid-cols-3"
      >
        <input type="hidden" name="entity" value="cameraInstance" />

        <CameraInstanceFields models={models} branches={branches} />

        <SubmitButton className="md:col-span-3">Thêm máy</SubmitButton>
      </form>

      <div className={TABLE_WRAPPER_CLASS}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-ink/5 text-ink/70">
            <tr>
              <th className="p-3">Mã máy</th>
              <th className="p-3">Model / Cơ sở</th>
              <th className="p-3">Giá thuê</th>
              <th className="p-3">Phim còn lại</th>
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
                <td className="p-3 font-medium">{camera.filmRemaining}</td>
                <td className="p-3">{CAMERA_STATUS_LABEL[camera.status]}</td>
                <td className="p-3">
                  <RowActions
                    editHref={`/cameras/${camera.id}/edit`}
                    entity="cameraInstance"
                    id={camera.id}
                  />
                </td>
              </tr>
            ))}
            {cameras.length === 0 && (
              <tr>
                <td colSpan={6} className="p-5 text-ink/50">
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
