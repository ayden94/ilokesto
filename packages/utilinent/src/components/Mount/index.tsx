import { useRef, useState, type ReactNode } from "react";
import { createProxy } from "../../core/createProxy";
import { createTagRenderer } from "../../core/createTagRenderer";
import { useIsomorphicLayoutEffect } from "../../hooks/useIsomorphicLayoutEffect";
import { isPromiseLike } from "../../utils/isPromiseLike";
import type { MountProps, MountType } from "./types";

function BaseMount({ children, fallback = null, onError }: MountProps) {
  const isFunction = typeof children === "function";
  const [resolvedChildren, setResolvedChildren] = useState<ReactNode>(() =>
    isFunction ? fallback : children,
  );
  const [status, setStatus] = useState<"resolved" | "fallback">(() =>
    isFunction ? "fallback" : "resolved",
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

    if (isPromiseLike<ReactNode>(result)) {
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

const renderForTag = createTagRenderer(
  BaseMount as (props: any) => React.ReactNode,
  ["children", "fallback", "onError"],
  { fallback: null },
);

export const Mount: MountType = createProxy(BaseMount, renderForTag, "mount");