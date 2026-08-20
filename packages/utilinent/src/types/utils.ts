export type { UtilinentRegister } from "./register";

/** Props extension for components that accept a `fallback` render. */
export interface Fallback {
  fallback?: React.ReactNode;
}
/** Maps a readonly tuple type to its non-nullable element types. */
export type NonNullableElements<T extends readonly any[]> = {
  -readonly [P in keyof T]: NonNullable<T[P]>;
};