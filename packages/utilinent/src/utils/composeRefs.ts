import type { MutableRefObject, Ref } from "react";

type RefCleanup = () => void;
type ComposableRef<T> =
  | Ref<T>
  | ((node: T | null) => RefCleanup | undefined)
  | undefined;

function setRef<T>(ref: ComposableRef<T>, node: T | null): RefCleanup | void {
  if (typeof ref === "function") {
    return ref(node);
  }

  if (ref != null) {
    const mutableRef: MutableRefObject<T | null> = ref;
    mutableRef.current = node;
  }
}

export function composeRefs<T>(...refs: ComposableRef<T>[]) {
  return (node: T | null) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (typeof cleanup === "function") {
        hasCleanup = true;
      }
      return cleanup;
    });

    if (hasCleanup) {
      return () => {
        cleanups.forEach((cleanup, index) => {
          if (typeof cleanup === "function") {
            cleanup();
          } else {
            setRef(refs[index], null);
          }
        });
      };
    }
  };
}