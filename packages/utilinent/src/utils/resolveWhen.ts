import type { NonNullableElements } from "../types";

export function resolveWhen<T extends readonly unknown[]>(value: T): value is NonNullableElements<T>;
export function resolveWhen<T>(value: T): value is NonNullable<T>;
export function resolveWhen(value: unknown) {
  return Array.isArray(value) ? value.length > 0 && value.every(Boolean) : !!value;
}
