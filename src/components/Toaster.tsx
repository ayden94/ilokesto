import {
  useCallback,
  useEffect,
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

function getStackOffset(
  items: ReadonlyArray<ToastItem>,
  index: number,
  gutter: number,
): number {
  return items.slice(0, index).reduce((offset, item) => {
    return offset + (item.height ?? 0) + gutter;
  }, 0);
}

function getToastStyle(position: ToastPosition, offset: number): CSSProperties {
  const translateY = position.startsWith("top") ? offset : -offset;

  return {
    pointerEvents: "auto",
    transform: `translateY(${translateY}px)`,
    transition: "transform 200ms ease, opacity 200ms ease",
  };
}

function ToastMeasure({
  item,
  offset,
  position,
  onHeight,
  children,
}: {
  readonly item: ToastItem;
  readonly offset: number;
  readonly position: ToastPosition;
  readonly onHeight: (id: string, height: number) => void;
  readonly children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;

    if (element === null) {
      return;
    }

    const nextHeight = element.offsetHeight;
    onHeight(item.id, nextHeight);
  }, [item.id, item.message, item.status, onHeight]);

  return (
    <div ref={ref} style={getToastStyle(position, offset)}>
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
      popover="manual"
      className={className}
      style={{
        ...style,
        border: "none",
        background: "transparent",
        margin: 0,
        overflow: "visible",
        inset: "unset",
      }}
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
      ...getContainerStyle(position),
      ...containerStyle,
    }),
    [containerStyle, position],
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

  const rows = orderedItems.map((item, index) => {
    const helpers = createHelpers(item);
    const offset = getStackOffset(orderedItems, index, gutter);
    const content = renderRow === undefined
      ? <ToastBar toast={item} position={position} />
      : renderRow(item, helpers);

    return (
      <ToastMeasure
        key={item.id}
        item={item}
        offset={offset}
        position={position}
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
            0% { transform: translate3d(var(--toast-enter-x, 0), var(--toast-enter-y, -200%), 0) scale(0.6); opacity: 0.5; }
            100% { transform: translate3d(0, 0, 0) scale(1); opacity: 1; }
          }
          @keyframes toast-exit {
            0% { transform: translate3d(0, 0, -1px) scale(1); opacity: 1; }
            100% { transform: translate3d(var(--toast-exit-x, 0), var(--toast-exit-y, -150%), -1px) scale(0.6); opacity: 0; }
          }
          @keyframes toast-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes toast-scale {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
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
            .toast-motion-spin { animation: none !important; }
            .toast-motion-scale { animation: none !important; }
          }
        `}
      </style>
      <Container className={containerClassName} style={containerStyleValue}>
        <div role="region" aria-label="Notifications" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          {rows}
        </div>
      </Container>
    </ToasterContext.Provider>
  );
}
