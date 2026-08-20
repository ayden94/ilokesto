import { isValidElement } from "react";
import type { NonNullableElements } from "../../types";
import { resolveWhen } from "../../utils/resolveWhen";
import type { MatchProps, MatchPropsArray } from "./types";

type MatchChildValue<T> = T extends readonly unknown[] ? NonNullableElements<T> : NonNullable<T>;
type MatchElementProps = MatchProps | MatchPropsArray<readonly unknown[]>;

/**
 * A condition case for {@link Switch}.
 *
 * Renders children when `when` is truthy; returns `null` otherwise.
 * Supports a render-prop callback that receives the narrowed value.
 *
 * @example
 * ```tsx
 * <Match when={user}>{(u) => <h1>Hello {u.name}</h1>}</Match>
 * ```
 */
export function Match<const T extends readonly unknown[]>(props: MatchPropsArray<T>): React.ReactNode;
export function Match<T>(props: MatchProps<T>): React.ReactNode;
export function Match<T>({ when, children }: MatchProps<T> | MatchPropsArray<readonly unknown[]>) {
  if (!resolveWhen(when)) {
    return null;
  }

  return typeof children === "function"
    ? (children as (value: MatchChildValue<typeof when>) => React.ReactNode)(
        when as MatchChildValue<typeof when>
      )
    : children;
}

export const isMatchElement = (child: React.ReactNode): child is React.ReactElement<MatchElementProps> =>
  isValidElement(child) && child.type === Match;
