import type { NonNullableElements } from "../types";

/**
 * Resolves a condition value for conditional rendering.
 *
 * Arrays are truthy when non-empty and every element is truthy;
 * all other values use standard truthiness.
 */
export function resolveWhen<T extends readonly unknown[]>(value: T): value is NonNullableElements<T>;
export function resolveWhen<T>(value: T): value is NonNullable<T>;
export function resolveWhen(value: unknown) {
  return Array.isArray(value) ? value.length > 0 && value.every(Boolean) : !!value;
}
