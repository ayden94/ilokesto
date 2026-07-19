import {
  useCallback,
  useEffect,
  useMemo,
  type CSSProperties,
} from "react";
import { DEFAULT_GUTTER, DEFAULT_LIMIT, DEFAULT_POSITION } from "../core/utils";
import { useToastItems } from "../hooks/useToastItems";
import { InlineContainer, TopLayerContainer } from "./ToasterContainer";
import { ToastBar } from "./ToastBar";
import { ToastMeasure } from "./ToastMeasure";
import { ToasterContext, useToasterRuntime } from "./ToastProvider";
import { getContainerStyle, getRegionStyle, getRowJustifyContent, getToastRowStyle } from "./toasterLayout";
import { toastMotionStyle } from "./toastMotionStyles";
import type {
  ToastItem,
  ToastRowHelpers,
  ToasterProps,
} from "../types/toast";

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

  const isTopPosition = activePosition.startsWith("top");
  const rowJustifyContent = getRowJustifyContent(activePosition);

  const totalHeight = useMemo(() => {
    return orderedItems.reduce((height, item, index) => {
      const gap = index === 0 ? 0 : gutter;

      return height + (item.height ?? 0) + gap;
    }, 0);
  }, [gutter, orderedItems]);

  const regionStyle = useMemo<CSSProperties>(
    () => getRegionStyle(totalHeight),
    [totalHeight],
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
    const content = renderRow === undefined
      ? <ToastBar toast={item} position={activePosition} />
      : renderRow(item, helpers);
    const rowStyle = getToastRowStyle({
      items: orderedItems,
      index,
      gutter,
      isTopPosition,
      justifyContent: rowJustifyContent,
    });

    return (
      <div key={item.id} className="toast-motion-row" style={rowStyle}>
        <ToastMeasure
          item={item}
          onHeight={runtime.updateHeight}
        >
          {content}
        </ToastMeasure>
      </div>
    );
  });


  const Container = transport === "top-layer" ? TopLayerContainer : InlineContainer;

  return (
    <ToasterContext.Provider value={runtime}>
      <style>{toastMotionStyle}</style>
      <Container className={containerClassName} style={containerStyleValue}>
        <section
          aria-label="Notifications"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={regionStyle}
        >
          {rows}
        </section>
      </Container>
    </ToasterContext.Provider>
  );
}
