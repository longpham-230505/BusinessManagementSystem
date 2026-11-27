import { Prisma } from "@prisma/client";
import { parseDateOnly, parseVnDateTimeLocal } from "@/lib/datetime";
import { BusinessRuleError } from "@/server/errors";

const NON_NEGATIVE_INTEGER_PATTERN = /^\d+$/;
const SIGNED_INTEGER_PATTERN = /^-?\d+$/;

/**
 * Đọc và kiểm tra dữ liệu từ FormData.
 * Mọi hàm đều ném BusinessRuleError với thông điệp tiếng Việt (có tên trường)
 * nên có thể hiển thị thẳng cho người dùng.
 */
export class FormReader {
  /**
   * @param labelPrefix tiền tố thêm vào thông báo lỗi, ví dụ "Dòng 2: " khi đọc
   *                    một dòng của bảng nhập liệu động (xem `rows`).
   */
  constructor(
    private readonly formData: FormData,
    private readonly labelPrefix = ""
  ) {}

  private fail(message: string): never {
    throw new BusinessRuleError(`${this.labelPrefix}${message}`);
  }

  /** Chuỗi đã trim; null nếu trống. */
  text(name: string): string | null {
    const value = String(this.formData.get(name) ?? "").trim();
    return value === "" ? null : value;
  }

  requiredText(name: string, label: string): string {
    const value = this.text(name);
    if (value === null) this.fail(`${label} là bắt buộc.`);
    return value;
  }

  /** Tất cả giá trị của các input trùng tên (ví dụ nhiều checkbox), bỏ giá trị trống. */
  textList(name: string): string[] {
    return this.formData
      .getAll(name)
      .map((value) => String(value).trim())
      .filter((value) => value !== "");
  }

  /**
   * Đọc bảng nhập liệu động: mỗi dòng của bảng gửi một giá trị cho MỖI tên trong
   * `names` (kể cả khi để trống), nên các danh sách cùng tên khớp nhau theo vị trí.
   * Trả về một FormReader cho từng dòng; dòng trống hoàn toàn được bỏ qua.
   * Lỗi của dòng nào sẽ có tiền tố "Dòng N: ".
   */
  rows(names: readonly string[]): FormReader[] {
    const columns = names.map((name) => this.formData.getAll(name).map((value) => String(value)));
    const rowCount = Math.max(0, ...columns.map((column) => column.length));

    const readers: FormReader[] = [];
    for (let index = 0; index < rowCount; index++) {
      const rowData = new FormData();
      names.forEach((name, column) => rowData.append(name, columns[column][index] ?? ""));

      const isBlank = names.every((name) => String(rowData.get(name)).trim() === "");
      if (!isBlank) readers.push(new FormReader(rowData, `Dòng ${index + 1}: `));
    }
    return readers;
  }

  /** Checkbox HTML: chỉ có mặt trong FormData (giá trị "on") khi được tick. */
  checkbox(name: string): boolean {
    return this.formData.get(name) === "on";
  }

  /** Số tiền VND (số nguyên không âm); null nếu để trống. */
  vnd(name: string, label: string): Prisma.Decimal | null {
    const value = this.text(name);
    if (value === null) return null;
    if (!NON_NEGATIVE_INTEGER_PATTERN.test(value)) {
      this.fail(`${label} phải là số tiền không âm, không có số lẻ.`);
    }
    return new Prisma.Decimal(value);
  }

  requiredVnd(name: string, label: string): Prisma.Decimal {
    const value = this.vnd(name, label);
    if (value === null) this.fail(`${label} là bắt buộc.`);
    return value;
  }

  /** Số tiền VND; để trống được hiểu là 0. */
  vndOrZero(name: string, label: string): Prisma.Decimal {
    return this.vnd(name, label) ?? new Prisma.Decimal(0);
  }

  nonNegativeInt(name: string, label: string): number {
    const value = this.requiredText(name, label);
    if (!NON_NEGATIVE_INTEGER_PATTERN.test(value)) {
      this.fail(`${label} phải là số nguyên không âm.`);
    }
    return Number(value);
  }

  /** Số nguyên lớn hơn 0 (ví dụ số lượng). */
  positiveInt(name: string, label: string): number {
    const value = this.nonNegativeInt(name, label);
    if (value === 0) this.fail(`${label} phải lớn hơn 0.`);
    return value;
  }

  /** Số nguyên khác 0, có thể âm (ví dụ điều chỉnh tồn kho: âm = hao hụt). */
  nonZeroInt(name: string, label: string): number {
    const value = this.requiredText(name, label);
    if (!SIGNED_INTEGER_PATTERN.test(value) || Number(value) === 0) {
      this.fail(`${label} phải là số nguyên khác 0.`);
    }
    return Number(value);
  }

  /** Giá trị phải nằm trong danh sách `allowed` (ví dụ các giá trị của một enum). */
  oneOf<T extends string>(name: string, label: string, allowed: readonly T[]): T {
    const value = this.requiredText(name, label);
    if (!allowed.includes(value as T)) this.fail(`${label} không hợp lệ.`);
    return value as T;
  }

  /** Ngày giờ từ `<input type="datetime-local">`, hiểu theo giờ Việt Nam. */
  requiredDateTime(name: string, label: string): Date {
    const date = parseVnDateTimeLocal(this.requiredText(name, label));
    if (!date) this.fail(`${label} không hợp lệ.`);
    return date;
  }

  /** Ngày từ `<input type="date">`; null nếu để trống. */
  date(name: string, label: string): Date | null {
    const value = this.text(name);
    if (value === null) return null;
    const date = parseDateOnly(value);
    if (!date) this.fail(`${label} không hợp lệ.`);
    return date;
  }

  requiredDate(name: string, label: string): Date {
    const date = this.date(name, label);
    if (!date) this.fail(`${label} là bắt buộc.`);
    return date;
  }
}
