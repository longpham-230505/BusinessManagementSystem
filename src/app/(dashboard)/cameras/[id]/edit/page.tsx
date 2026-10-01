import Link from "next/link";
import { notFound } from "next/navigation";
import { CameraInstanceFields } from "@/components/camera-instance-fields";
import { FlashMessages, type FlashSearchParams } from "@/components/flash-messages";
import { SubmitButton } from "@/components/form-fields";
import { saveMasterData } from "@/server/master-data";
import {
  findCameraInstance,
  listBranches,
  listCameraModels,
} from "@/server/queries/master-data.queries";

export default async function EditCameraPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<FlashSearchParams>;
}) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  const [camera, models, branches] = await Promise.all([
    findCameraInstance(id),
    listCameraModels(),
    listBranches(),
  ]);
  if (!camera) notFound();

  return (
    <div className="max-w-4xl space-y-5">
      <header>
        <Link href="/cameras" className="text-sm text-accent underline">
          ← Máy ảnh
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Sửa máy {camera.assetCode}</h1>
        <p className="mt-1 text-sm text-ink/60">
          Giá thuê mới chỉ áp dụng cho đơn tạo sau này; đơn cũ giữ giá đã lưu. Đổi cơ sở sẽ tự ghi
          lại lịch sử chuyển máy.
        </p>
      </header>

      <FlashMessages error={flash.error} />

      <form
        action={saveMasterData}
        className="grid gap-3 rounded-lg border border-line bg-white p-5 shadow-sm md:grid-cols-3"
      >
        <input type="hidden" name="entity" value="cameraInstance" />
        <input type="hidden" name="id" value={camera.id} />

        <CameraInstanceFields models={models} branches={branches} camera={camera} />

        <SubmitButton className="md:col-span-3">Lưu thay đổi</SubmitButton>
      </form>
    </div>
  );
}
