export type { UtilinentRegister } from "./register";

export interface Fallback {
  fallback?: React.ReactNode;
}
export type NonNullableElements<T extends readonly any[]> = {
  -readonly [P in keyof T]: NonNullable<T[P]>;
};

export type ExtractValues<T, K extends keyof T> = T extends any ? T[K] : never;

// 더 정확한 Union 타입 감지
type IsUnion<T, U = T> = T extends any ? [U] extends [T] ? false : true : false;

// 개선된 ExtractByKeyValue
export type ExtractByKeyValue<T, K extends keyof T, V> = 
  T extends any 
    ? IsUnion<T> extends true
      ? T[K] extends V 
        ? T 
        : never
      : V extends T[K]
        ? T
        : never
    : never;

export type GetLiteralKeys<T> = {
  [K in keyof T]: T[K] extends string 
    ? string extends T[K] 
      ? never 
      : K
    : T[K] extends number
    ? number extends T[K]
      ? never
      : K
    : T[K] extends boolean
    ? boolean extends T[K]
      ? never
      : K
    : T[K] extends bigint
    ? bigint extends T[K]
      ? never
      : K
    : T[K] extends symbol
    ? symbol extends T[K]
      ? never
      : K
    : never;
}[keyof T];

export type LiteralKeys<T> = [GetLiteralKeys<T>] extends [never] ? keyof T : GetLiteralKeys<T>;

