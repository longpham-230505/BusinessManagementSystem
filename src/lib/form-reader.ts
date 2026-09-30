import { Prisma } from "@prisma/client";
import { parseDateOnly, parseVnDateTimeLocal } from "@/lib/datetime";
import { BusinessRuleError } from "@/server/errors";

const NON_NEGATIVE_INTEGER_PATTERN = /^\d+$/;

/**
 * Đọc và kiểm tra dữ liệu từ FormData.
 * Mọi hàm đều ném BusinessRuleError với thông điệp tiếng Việt (có tên trường)
 * nên có thể hiển thị thẳng cho người dùng.
 */
export class FormReader {
  constructor(private readonly formData: FormData) {}

  /** Chuỗi đã trim; null nếu trống. */
  text(name: string): string | null {
    const value = String(this.formData.get(name) ?? "").trim();
    return value === "" ? null : value;
  }

  requiredText(name: string, label: string): string {
    const value = this.text(name);
    if (value === null) throw new BusinessRuleError(`${label} là bắt buộc.`);
    return value;
  }

  /** Tất cả giá trị của các input trùng tên (ví dụ nhiều checkbox), bỏ giá trị trống. */
  textList(name: string): string[] {
    return this.formData
      .getAll(name)
      .map((value) => String(value).trim())
      .filter((value) => value !== "");
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
      throw new BusinessRuleError(
        `${label} phải là số tiền không âm, không có số lẻ.`
      );
    }
    return new Prisma.Decimal(value);
  }

  requiredVnd(name: string, label: string): Prisma.Decimal {
    const value = this.vnd(name, label);
    if (value === null) throw new BusinessRuleError(`${label} là bắt buộc.`);
    return value;
  }

  /** Số tiền VND; để trống được hiểu là 0. */
  vndOrZero(name: string, label: string): Prisma.Decimal {
    return this.vnd(name, label) ?? new Prisma.Decimal(0);
  }

  nonNegativeInt(name: string, label: string): number {
    const value = this.requiredText(name, label);
    if (!NON_NEGATIVE_INTEGER_PATTERN.test(value)) {
      throw new BusinessRuleError(`${label} phải là số nguyên không âm.`);
    }
    return Number(value);
  }

  /** Giá trị phải nằm trong danh sách `allowed` (ví dụ các giá trị của một enum). */
  oneOf<T extends string>(
    name: string,
    label: string,
    allowed: readonly T[]
  ): T {
    const value = this.requiredText(name, label);
    if (!allowed.includes(value as T)) {
      throw new BusinessRuleError(`${label} không hợp lệ.`);
    }
    return value as T;
  }

  /** Ngày giờ từ `<input type="datetime-local">`, hiểu theo giờ Việt Nam. */
  requiredDateTime(name: string, label: string): Date {
    const date = parseVnDateTimeLocal(this.requiredText(name, label));
    if (!date) throw new BusinessRuleError(`${label} không hợp lệ.`);
    return date;
  }

  /** Ngày từ `<input type="date">`; null nếu để trống. */
  date(name: string, label: string): Date | null {
    const value = this.text(name);
    if (value === null) return null;
    const date = parseDateOnly(value);
    if (!date) throw new BusinessRuleError(`${label} không hợp lệ.`);
    return date;
  }
}
