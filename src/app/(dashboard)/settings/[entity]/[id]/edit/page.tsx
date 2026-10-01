import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashMessages, type FlashSearchParams } from "@/components/flash-messages";
import { SubmitButton } from "@/components/form-fields";
import { saveMasterData } from "@/server/master-data";
import {
  findSettingsRecord,
  isSettingsEntity,
  type SettingsRecord,
} from "@/server/queries/master-data.queries";
import {
  BranchFields,
  CameraModelFields,
  FilmTypeFields,
  PrintServiceFields,
  TransactionCategoryFields,
} from "../../../entity-fields";

const ENTITY_TITLE = {
  branch: "cơ sở",
  cameraModel: "model máy",
  filmType: "loại phim",
  printService: "dịch vụ in",
  transactionCategory: "danh mục tài chính",
} as const;

/** Sửa một bản ghi dữ liệu nền trong Cài đặt (cơ sở, model máy, loại phim, dịch vụ in, danh mục). */
export default async function EditSettingsRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string; id: string }>;
  searchParams: Promise<FlashSearchParams>;
}) {
  const [{ entity, id }, flash] = await Promise.all([params, searchParams]);
  if (!isSettingsEntity(entity)) notFound();

  const loaded = await findSettingsRecord(entity, id);
  if (!loaded) notFound();

  return (
    <div className="max-w-3xl space-y-5">
      <header>
        <Link href="/settings" className="text-sm text-accent underline">
          ← Cài đặt
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          Sửa {ENTITY_TITLE[entity]}: {loaded.record.name}
        </h1>
      </header>

      <FlashMessages error={flash.error} />

      <form
        action={saveMasterData}
        className="rounded-lg border border-line bg-white p-5 shadow-sm"
      >
        <input type="hidden" name="entity" value={entity} />
        <input type="hidden" name="id" value={id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldsFor loaded={loaded} />
        </div>
        <SubmitButton className="mt-5">Lưu thay đổi</SubmitButton>
      </form>
    </div>
  );
}

function FieldsFor({ loaded }: { loaded: SettingsRecord }) {
  switch (loaded.entity) {
    case "branch":
      return <BranchFields branch={loaded.record} />;
    case "cameraModel":
      return <CameraModelFields model={loaded.record} />;
    case "filmType":
      return <FilmTypeFields filmType={loaded.record} />;
    case "printService":
      return <PrintServiceFields service={loaded.record} />;
    case "transactionCategory":
      return <TransactionCategoryFields category={loaded.record} />;
  }
}
