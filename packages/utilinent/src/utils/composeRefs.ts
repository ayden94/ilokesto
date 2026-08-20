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

/**
 * Composes multiple refs (callback or object) into a single callback ref.
 *
 * Supports React 19 ref cleanup: if any ref returns a cleanup function,
 * a composite cleanup is returned that resets all refs on unmount.
 */
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