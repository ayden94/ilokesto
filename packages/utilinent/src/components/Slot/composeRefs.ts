import { Ref } from "react";

export function composeRefs<T>(...refs: Ref<T>[]) {
    return (node: T) => {
      for (const ref of refs) {
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref != null) {
          (ref as React.MutableRefObject<T>).current = node;
        }
      }
    };
  }