import { isValidElement } from "react";

export function isSlottable(child: React.ReactNode): child is React.ReactElement {
  return isValidElement(child) && child.type === Slottable;
}

/**
 * Marks a child as the slottable content within a {@link Slot} that has multiple children.
 *
 * The slottable child receives the merged props from Slot; other children
 * are rendered alongside it as-is.
 */
export const Slottable = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
