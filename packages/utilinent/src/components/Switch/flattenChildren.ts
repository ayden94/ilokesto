import { Children, Fragment, isValidElement } from "react";

export const flattenChildren = (nodes: React.ReactNode): React.ReactNode[] =>
  Children.toArray(nodes).flatMap((child) => {
    if (isValidElement(child) && child.type === Fragment) {
      return flattenChildren(child.props.children);
    }
    return [child];
  });
