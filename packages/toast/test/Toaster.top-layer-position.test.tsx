import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "../src/components/Toaster";
import { getRuntime } from "../src/core/registry";
import type { ToastPosition } from "../src/types/toast";

const TOASTER_ID = "top-layer-position-toaster";
const originalShowPopover = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "showPopover",
);
const originalHidePopover = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "hidePopover",
);
const showPopover = vi.fn();
const hidePopover = vi.fn();

function restorePopoverMethod(
  name: "showPopover" | "hidePopover",
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, name);
    return;
  }

  Object.defineProperty(HTMLElement.prototype, name, descriptor);
}

function renderTopLayerToaster(position: ToastPosition): HTMLElement {
  render(
    <Toaster
      toasterId={TOASTER_ID}
      position={position}
      transport="top-layer"
    />,
  );

  const container = screen.getByRole("region", { name: "Notifications" }).parentElement;

  if (!(container instanceof HTMLElement)) {
    throw new TypeError("Expected the notification region to have a container");
  }

  return container;
}

beforeEach(() => {
  Object.defineProperties(HTMLElement.prototype, {
    showPopover: {
      configurable: true,
      value: showPopover,
    },
    hidePopover: {
      configurable: true,
      value: hidePopover,
    },
  });
});

afterEach(() => {
  cleanup();
  restorePopoverMethod("showPopover", originalShowPopover);
  restorePopoverMethod("hidePopover", originalHidePopover);
  showPopover.mockReset();
  hidePopover.mockReset();
  expect(getRuntime(TOASTER_ID)).toBeUndefined();
});

describe("Toaster top-layer positioning", () => {
  it("preserves bottom and left offsets for bottom-left", () => {
    // Given
    const position = "bottom-left";

    // When
    const container = renderTopLayerToaster(position);

    // Then
    expect(container.style.bottom).toBe("0px");
    expect(container.style.left).toBe("0px");
    expect(container.style.inset).toBe("auto");
    expect(container.style.cssText.indexOf("inset")).toBeLessThan(
      container.style.cssText.indexOf("bottom"),
    );
  });

  it("preserves top and right offsets for top-right", () => {
    // Given
    const position = "top-right";

    // When
    const container = renderTopLayerToaster(position);

    // Then
    expect(container.style.top).toBe("0px");
    expect(container.style.right).toBe("0px");
    expect(container.style.inset).toBe("auto");
    expect(container.style.cssText.indexOf("inset")).toBeLessThan(
      container.style.cssText.indexOf("top"),
    );
  });

  it("preserves position after applying manual-popover style overrides", () => {
    // Given
    const position = "bottom-right";

    // When
    const container = renderTopLayerToaster(position);

    // Then
    expect(container.getAttribute("popover")).toBe("manual");
    expect(showPopover).toHaveBeenCalledOnce();
    expect(container.style.bottom).toBe("0px");
    expect(container.style.right).toBe("0px");
    expect(container.style.borderStyle).toBe("none");
    expect(container.style.backgroundColor).toBe("transparent");
    expect(container.style.margin).toBe("0px");
    expect(container.style.overflow).toBe("visible");
    expect(container.style.inset).toBe("auto");
    expect(container.style.cssText.indexOf("inset")).toBeLessThan(
      container.style.cssText.indexOf("bottom"),
    );
  });
});
