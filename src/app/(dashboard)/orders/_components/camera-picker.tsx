import type { CameraInstanceStatus } from "@prisma/client";
import { CAMERA_STATUS_LABEL } from "@/lib/labels";

type PickableCamera = {
  id: string;
  assetCode: string;
  status: CameraInstanceStatus;
  cameraModel: { name: string };
  branch: { name: string };
};

/**
 * Danh sách máy để tick chọn khi tạo hoặc sửa đơn thuê.
 * Máy đã ngừng sử dụng không chọn mới được, nhưng máy ĐANG có trong đơn (`selectedIds`)
 * không bị khóa — checkbox bị `disabled` sẽ không được gửi đi và máy sẽ bị coi là đã gỡ.
 */
export function CameraPicker({
  cameras,
  selectedIds = [],
}: {
  cameras: PickableCamera[];
  selectedIds?: string[];
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">
        Máy thuê <span className="text-red-700">*</span>
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {cameras.map((camera) => {
          const isSelected = selectedIds.includes(camera.id);
          return (
            <label
              key={camera.id}
              className="flex items-center gap-3 rounded border border-line p-3 text-sm"
            >
              <input
                type="checkbox"
                name="cameraIds"
                value={camera.id}
                defaultChecked={isSelected}
                disabled={camera.status === "RETIRED" && !isSelected}
              />
              <span>
                <b>{camera.assetCode}</b> · {camera.cameraModel.name}
                <br />
                <span className="text-ink/55">
                  Đang ở {camera.branch.name} · {CAMERA_STATUS_LABEL[camera.status]}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
