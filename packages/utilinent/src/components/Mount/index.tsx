import {
  ComponentPropsWithRef,
  createElement,
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createProxy } from "../../core/createProxy";
import type { MountProps, MountType } from "./types";

const isPromiseLike = (value: unknown): value is PromiseLike<ReactNode> =>
  (typeof value === "object" || typeof value === "function") &&
  value !== null &&
  typeof (value as { then?: unknown }).then === "function";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function BaseMount({ children, fallback = null, onError }: MountProps) {
  const isFunction = typeof children === "function";
  const [resolvedChildren, setResolvedChildren] = useState<ReactNode>(() =>
    isFunction ? fallback : children
  );
  const [status, setStatus] = useState<"resolved" | "fallback">(() =>
    isFunction ? "fallback" : "resolved"
  );
  const callIdRef = useRef(0);

  useIsomorphicLayoutEffect(() => {
    const callId = ++callIdRef.current;
    let canceled = false;

    if (typeof children !== "function") {
      setResolvedChildren(children);
      setStatus("resolved");
      return () => {
        canceled = true;
      };
    }

    let result: ReactNode | Promise<ReactNode>;
    try {
      result = children();
    } catch (error) {
      setStatus("fallback");
      console.error("Mount children threw:", error);
      onError?.(error);
      return () => {
        canceled = true;
      };
    }

    if (isPromiseLike(result)) {
      setStatus("fallback");
      result
        .then((value) => {
          if (canceled || callId !== callIdRef.current) {
            return;
          }
          setResolvedChildren(value);
          setStatus("resolved");
        })
        .catch((error) => {
          if (canceled || callId !== callIdRef.current) {
            return;
          }
          setStatus("fallback");
          console.error("Mount children promise rejected:", error);
          onError?.(error);
        });
      return () => {
        canceled = true;
      };
    }

    setResolvedChildren(result);
    setStatus("resolved");
    return () => {
      canceled = true;
    };
  }, [children, onError]);

  return status === "resolved" ? resolvedChildren : fallback;
}

const renderForTag =
  (tag: any) =>
  forwardRef(function Render(
    { children, fallback = null, onError, ...props }: MountProps & ComponentPropsWithRef<any>,
    ref: any
  ) {
    const content = BaseMount({ children, fallback, onError });
    return createElement(tag, { ...props, ref }, content);
  });

export const Mount: MountType = createProxy(BaseMount, renderForTag, "mount");
