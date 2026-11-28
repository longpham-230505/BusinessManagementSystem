import { BackLink } from "@/components/back-link";
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
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <BackLink href="/cameras" label="Máy ảnh" />
        <h1 className="mt-2 text-2xl font-medium">Sửa máy {camera.assetCode}</h1>
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
