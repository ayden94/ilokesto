export type { UtilinentRegister } from "./register";

export interface Fallback {
  fallback?: React.ReactNode;
}
export type NonNullableElements<T extends readonly any[]> = {
  -readonly [P in keyof T]: NonNullable<T[P]>;
};