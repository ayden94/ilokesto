import { afterEach, describe, expect, it, vi } from "vitest";
import { createToastRuntime } from "../src/core/createToastRuntime";
import type {
  DefaultToastOptions,
  ToastRuntimeApi,
} from "../src/types/toast";

const CONFIGURED_TOAST_OPTIONS = {
  duration: 12_345,
  removeDelay: 678,
  className: "configured-toast",
  style: { backgroundColor: "rgb(12, 34, 56)" },
  ariaProps: {
    role: "alert",
    "aria-live": "assertive",
    "aria-atomic": false,
  },
} satisfies DefaultToastOptions;

let runtime: ToastRuntimeApi | undefined;

afterEach(() => {
  runtime?.clear();
  runtime = undefined;
  vi.useRealTimers();
});

describe("createToastRuntime view configuration", () => {
  it("clears removed toast defaults for future items without changing resolved existing items", () => {
    // Given
    vi.useFakeTimers();
    runtime = createToastRuntime("view-defaults-runtime");
    runtime.configureView({
      limit: 10,
      position: "top-right",
      toastOptions: CONFIGURED_TOAST_OPTIONS,
    });
    runtime.addToast("blank", "Configured toast", { id: "configured" });
    const configuredItem = runtime.getRawSnapshot()[0];

    expect(configuredItem).toMatchObject({
      duration: 12_345,
      removeDelay: 678,
      className: "configured-toast",
      style: { backgroundColor: "rgb(12, 34, 56)" },
      ariaProps: {
        role: "alert",
        "aria-live": "assertive",
        "aria-atomic": false,
      },
    });

    // When
    runtime.configureView({
      limit: 10,
      position: "top-right",
      toastOptions: undefined,
    });
    runtime.addToast("blank", "Unconfigured toast", { id: "unconfigured" });

    // Then
    const [preservedItem, unconfiguredItem] = runtime.getRawSnapshot();
    expect(preservedItem).toBe(configuredItem);
    expect(preservedItem).toMatchObject({
      duration: 12_345,
      removeDelay: 678,
      className: "configured-toast",
      style: { backgroundColor: "rgb(12, 34, 56)" },
      ariaProps: {
        role: "alert",
        "aria-live": "assertive",
        "aria-atomic": false,
      },
    });
    expect(unconfiguredItem?.className).toBeUndefined();
    expect(unconfiguredItem?.duration).toBe(4_000);
    expect(unconfiguredItem?.removeDelay).toBe(1_000);
    expect(unconfiguredItem?.style).toEqual({});
    expect(unconfiguredItem?.ariaProps).toEqual({
      role: "status",
      "aria-live": "polite",
      "aria-atomic": true,
    });
  });

  it("invalidates the visible snapshot when position changes", () => {
    // Given
    runtime = createToastRuntime("position-runtime");
    runtime.configureView({ limit: 10, position: "top-right" });
    runtime.addToast("blank", "Top toast", {
      id: "top",
      duration: Number.POSITIVE_INFINITY,
      position: "top-right",
    });
    runtime.addToast("blank", "Bottom toast", {
      id: "bottom",
      duration: Number.POSITIVE_INFINITY,
      position: "bottom-left",
    });
    const topSnapshot = runtime.getSnapshot();

    // When
    runtime.configureView({ limit: 10, position: "bottom-left" });

    // Then
    const bottomSnapshot = runtime.getSnapshot();
    expect(bottomSnapshot).not.toBe(topSnapshot);
    expect(bottomSnapshot.map((item) => item.message)).toEqual(["Bottom toast"]);
  });

  it("invalidates the visible snapshot when limit changes", () => {
    // Given
    runtime = createToastRuntime("limit-runtime");
    runtime.configureView({ limit: 2, position: "top-right" });
    runtime.addToast("blank", "First toast", {
      id: "first",
      duration: Number.POSITIVE_INFINITY,
    });
    runtime.addToast("blank", "Second toast", {
      id: "second",
      duration: Number.POSITIVE_INFINITY,
    });
    const twoItemSnapshot = runtime.getSnapshot();

    // When
    runtime.configureView({ limit: 1, position: "top-right" });

    // Then
    const oneItemSnapshot = runtime.getSnapshot();
    expect(oneItemSnapshot).not.toBe(twoItemSnapshot);
    expect(oneItemSnapshot.map((item) => item.message)).toEqual(["First toast"]);
  });
});
