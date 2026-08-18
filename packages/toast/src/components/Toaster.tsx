import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { DEFAULT_GUTTER, DEFAULT_LIMIT, DEFAULT_POSITION } from "../core/utils";
import { useToastItems } from "../hooks/useToastItems";
import { ToastBar } from "./ToastBar";
import { ToasterContext, useToasterRuntime } from "./ToastProvider";
import type {
  ToastItem,
  ToastPosition,
  ToastRowHelpers,
  ToasterProps,
} from "../types/toast";

function supportsPopover(): boolean {
  if (typeof HTMLElement === "undefined") {
    return false;
  }

  return typeof HTMLElement.prototype.showPopover === "function";
}

function getContainerStyle(position: ToastPosition): CSSProperties {
  const style: CSSProperties = {
    position: "fixed",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    pointerEvents: "none",
    padding: 16,
  };

  if (position.startsWith("top")) {
    style.top = 0;
  } else {
    style.bottom = 0;
  }

  if (position.endsWith("left")) {
    style.left = 0;
    style.alignItems = "flex-start";
  } else if (position.endsWith("right")) {
    style.right = 0;
    style.alignItems = "flex-end";
  } else {
    style.left = "50%";
    style.transform = "translateX(-50%)";
    style.alignItems = "center";
  }

  return style;
}

function getRegionStyle(position: ToastPosition, gutter: number): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: position.endsWith("left")
      ? "flex-start"
      : position.endsWith("right")
        ? "flex-end"
        : "center",
    gap: gutter,
  };
}

function ToastMeasure({
  item,
  onHeight,
  children,
}: {
  readonly item: ToastItem;
  readonly onHeight: (id: string, height: number) => void;
  readonly children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;

    if (element === null) {
      return;
    }

    const updateHeight = () => {
      onHeight(item.id, element.offsetHeight);
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [item.id, item.message, item.status, onHeight]);

  return (
    <div ref={ref} style={{ width: "fit-content", maxWidth: "100%", pointerEvents: "auto" }}>
      {children}
    </div>
  );
}

function TopLayerContainer({
  style,
  className,
  children,
}: {
  readonly style: CSSProperties;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;

    if (element === null || !supportsPopover()) {
      return;
    }

    try {
      element.showPopover();
    } catch (error) {
      console.error("Failed to show top-layer toast popover", error);
    }

    return () => {
      if (typeof element.hidePopover !== "function") {
        return;
      }

      try {
        element.hidePopover();
      } catch (error) {
        console.error("Failed to hide top-layer toast popover", error);
      }
    };
  }, []);

  if (!supportsPopover()) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        inset: "auto",
        ...style,
        border: "none",
        background: "transparent",
        margin: 0,
        overflow: "visible",
      }}
      {...({ popover: "manual" } as React.HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </div>
  );
}

function InlineContainer({
  style,
  className,
  children,
}: {
  readonly style: CSSProperties;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

export function Toaster({
  toasterId,
  position = DEFAULT_POSITION,
  transport = "inline",
  limit = DEFAULT_LIMIT,
  reverseOrder = false,
  gutter = DEFAULT_GUTTER,
  containerStyle,
  containerClassName,
  toastOptions,
  children: renderRow,
}: ToasterProps) {
  const runtime = useToasterRuntime(toasterId);
  const items = useToastItems(runtime);
  const activePosition = toastOptions?.position ?? position;

  useEffect(() => {
    runtime.configureView({
      limit,
      position: activePosition,
      toastOptions,
    });
  }, [activePosition, limit, runtime, toastOptions]);

  const orderedItems = useMemo(() => {
    return reverseOrder ? [...items].reverse() : items;
  }, [items, reverseOrder]);

  const containerStyleValue = useMemo<CSSProperties>(
    () => ({
      ...getContainerStyle(activePosition),
      ...containerStyle,
    }),
    [activePosition, containerStyle],
  );

  const regionStyle = useMemo<CSSProperties>(
    () => getRegionStyle(activePosition, gutter),
    [activePosition, gutter],
  );

  const createHelpers = useCallback(
    (item: ToastItem): ToastRowHelpers => ({
      dismiss: () => runtime.dismiss(item.id),
      remove: () => runtime.remove(item.id),
    }),
    [runtime],
  );

  const handleMouseEnter = useCallback(() => {
    runtime.startPause();
  }, [runtime]);

  const handleMouseLeave = useCallback(() => {
    runtime.endPause();
  }, [runtime]);

  const rows = orderedItems.map((item) => {
    const helpers = createHelpers(item);
    const content = renderRow === undefined
      ? <ToastBar toast={item} position={activePosition} />
      : renderRow(item, helpers);

    return (
      <ToastMeasure
        key={item.id}
        item={item}
        onHeight={runtime.updateHeight}
      >
        {content}
      </ToastMeasure>
    );
  });


  const Container = transport === "top-layer" ? TopLayerContainer : InlineContainer;

  return (
    <ToasterContext.Provider value={runtime}>
      <style>
        {`
          @keyframes toast-enter {
            0% { transform: translate3d(var(--toast-enter-x, 0), var(--toast-enter-y, -14px), 0) scale(0.96); opacity: 0; }
            100% { transform: translate3d(0, 0, 0) scale(1); opacity: 1; }
          }
          @keyframes toast-exit {
            0% { transform: translate3d(0, 0, 0) scale(1); opacity: 1; }
            100% { transform: translate3d(var(--toast-exit-x, 0), var(--toast-exit-y, -10px), 0) scale(0.96); opacity: 0; }
          }
          @keyframes toast-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes toast-icon-circle {
            0% { transform: scale(0.72) rotate(45deg); opacity: 0; }
            100% { transform: scale(1) rotate(45deg); opacity: 1; }
          }
          @keyframes toast-icon-check {
            0% { width: 0; height: 0; opacity: 0; }
            45% { width: 6px; height: 0; opacity: 1; }
            100% { width: 6px; height: 10px; opacity: 1; }
          }
          @keyframes toast-icon-cross-first {
            0% { transform: translate(-50%, -50%) rotate(45deg) scale(0.6); opacity: 0; }
            100% { transform: translate(-50%, -50%) rotate(45deg) scale(1); opacity: 1; }
          }
          @keyframes toast-icon-cross-second {
            0% { transform: translate(-50%, -50%) rotate(-45deg) scale(0.6); opacity: 0; }
            100% { transform: translate(-50%, -50%) rotate(-45deg) scale(1); opacity: 1; }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes toast-enter {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }
            @keyframes toast-exit {
              0% { opacity: 1; }
              100% { opacity: 0; }
            }
            .toast-motion-spin,
            .toast-motion-circle,
            .toast-motion-check,
            .toast-motion-cross-first,
            .toast-motion-cross-second { animation: none !important; }
          }
        `}
      </style>
      <Container className={containerClassName} style={containerStyleValue}>
        <div
          role="region"
          aria-label="Notifications"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={regionStyle}
        >
          {rows}
        </div>
      </Container>
    </ToasterContext.Provider>
  );
}
