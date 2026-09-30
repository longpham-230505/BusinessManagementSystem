import type { ReactNode } from "react";
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
} from "@/components/form-fields";
import { formatVnd } from "@/lib/money";
import { saveMasterData } from "@/server/master-data";
import {
  listBranches,
  listCameraModels,
  listFilmTypes,
  listPrintServices,
  listTransactionCategories,
} from "@/server/queries/master-data.queries";

const DEFAULT_BOOKING_DEPOSIT = 40000;

const activeLabel = (active: boolean) => (active ? "Đang dùng" : "Ngưng dùng");

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<FlashSearchParams>;
}) {
  const [branches, models, films, services, categories, flash] =
    await Promise.all([
      listBranches(),
      listCameraModels(),
      listFilmTypes(),
      listPrintServices(),
      listTransactionCategories(),
      searchParams,
    ]);

  return (
    <div className="max-w-6xl space-y-10">
      <header>
        <h1 className="text-2xl font-semibold">Cài đặt dữ liệu nền</h1>
        <p className="mt-1 text-sm text-ink/60">
          Quản lý các dữ liệu dùng chung cho đơn hàng và báo cáo.
        </p>
      </header>

      <FlashMessages {...flash} />

      <SettingsSection>
        <EntityForm title="Cơ sở mới" entity="branch">
          <Field name="name" label="Tên cơ sở" required />
          <Field name="address" label="Địa chỉ" />
          <Field name="notes" label="Ghi chú" />
        </EntityForm>
        <EntityList
          title="Cơ sở"
          entity="branch"
          items={branches}
          render={(branch) => (
            <>
              <b>{branch.name}</b>
              <span>{branch.address ?? "Chưa có địa chỉ"}</span>
            </>
          )}
        />
      </SettingsSection>

      <SettingsSection>
        <EntityForm title="Model máy mới" entity="cameraModel">
          <Field name="name" label="Tên model" required />
          <Field
            name="defaultBookingDeposit"
            label="Cọc giữ chỗ mặc định"
            type="number"
            defaultValue={DEFAULT_BOOKING_DEPOSIT}
            required
          />
          <Field
            name="defaultPrice1day"
            label="Giá thuê 1 ngày mặc định"
            type="number"
          />
          <Field
            name="defaultPriceCombo3"
            label="Giá combo 3 ngày mặc định"
            type="number"
          />
          <Field name="description" label="Mô tả" />
          <ActiveCheckbox />
        </EntityForm>
        <EntityList
          title="Model máy"
          entity="cameraModel"
          items={models}
          render={(model) => (
            <>
              <b>{model.name}</b>
              <span>
                Cọc {formatVnd(model.defaultBookingDeposit)} ·{" "}
                {activeLabel(model.active)}
              </span>
            </>
          )}
        />
      </SettingsSection>

      <SettingsSection>
        <EntityForm title="Loại phim mới" entity="filmType">
          <Field name="name" label="Tên loại phim" required />
          <Field
            name="defaultSalePrice"
            label="Giá bán mặc định"
            type="number"
            required
          />
          <ActiveCheckbox />
        </EntityForm>
        <EntityList
          title="Loại phim"
          entity="filmType"
          items={films}
          render={(film) => (
            <>
              <b>{film.name}</b>
              <span>
                {formatVnd(film.defaultSalePrice)} · {activeLabel(film.active)}
              </span>
            </>
          )}
        />
      </SettingsSection>

      <SettingsSection>
        <EntityForm title="Dịch vụ in mới" entity="printService">
          <Field name="name" label="Tên dịch vụ" required />
          <Field name="unitPrice" label="Đơn giá" type="number" required />
          <ActiveCheckbox />
        </EntityForm>
        <EntityList
          title="Dịch vụ in"
          entity="printService"
          items={services}
          render={(service) => (
            <>
              <b>{service.name}</b>
              <span>
                {formatVnd(service.unitPrice)} · {activeLabel(service.active)}
              </span>
            </>
          )}
        />
      </SettingsSection>

      <SettingsSection>
        <EntityForm title="Danh mục tài chính mới" entity="transactionCategory">
          <Field name="name" label="Tên danh mục" required />
          <SelectField name="transactionType" label="Loại">
            <option value="EXPENSE">Chi phí</option>
            <option value="INCOME">Thu nhập khác</option>
          </SelectField>
          <ActiveCheckbox />
        </EntityForm>
        <EntityList
          title="Danh mục tài chính"
          entity="transactionCategory"
          items={categories}
          render={(category) => (
            <>
              <b>{category.name}</b>
              <span>
                {category.transactionType === "EXPENSE"
                  ? "Chi phí"
                  : "Thu nhập"}{" "}
                · {activeLabel(category.active)}
              </span>
            </>
          )}
        />
      </SettingsSection>
    </div>
  );
}

/** Mỗi loại dữ liệu nền: form thêm mới bên trái, danh sách bên phải. */
function SettingsSection({ children }: { children: ReactNode }) {
  return <section className="grid gap-6 lg:grid-cols-2">{children}</section>;
}

function ActiveCheckbox() {
  return <CheckboxField name="active" label="Đang sử dụng" defaultChecked />;
}

function EntityForm({
  title,
  entity,
  children,
}: {
  title: string;
  entity: string;
  children: ReactNode;
}) {
  return (
    <form
      action={saveMasterData}
      className="rounded-lg border border-line bg-white p-5 shadow-sm"
    >
      <h2 className="mb-4 font-medium">{title}</h2>
      <input type="hidden" name="entity" value={entity} />
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      <SubmitButton className="mt-5">Lưu</SubmitButton>
    </form>
  );
}

function EntityList<T extends { id: string }>({
  title,
  entity,
  items,
  render,
}: {
  title: string;
  entity: string;
  items: T[];
  render: (item: T) => ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <h2 className="mb-4 font-medium">{title}</h2>
      <div className="divide-y divide-line">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 py-3 text-sm"
          >
            <div className="grid">{render(item)}</div>
            <SoftDeleteForm entity={entity} id={item.id} />
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-3 text-sm text-ink/50">Chưa có dữ liệu.</p>
        )}
      </div>
    </div>
  );
}
