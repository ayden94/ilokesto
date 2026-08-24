/**
 * A read-only state snapshot that retains a callable state's call signature.
 *
 * `Readonly<T>` maps callable types to their own properties and erases their
 * call signature. Intersecting the reconstructed signature with `Readonly<T>`
 * keeps callable own properties read-only without freezing runtime values.
 */
export type ReadonlySnapshot<T> = T extends (
  ...arguments_: infer Arguments
) => infer Result
  ? ((...arguments_: Arguments) => Result) & Readonly<T>
  : Readonly<T>;

export function readonlySnapshot<T>(state: Readonly<T>): ReadonlySnapshot<T> {
  return state as ReadonlySnapshot<T>;
}
