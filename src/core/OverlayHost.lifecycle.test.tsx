import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { createOverlayContext } from "./createOverlayContext";
import type { OverlayAdapterComponent, OverlayAdapterHooks } from "../contracts/adapter";

function createTrackingAdapter(): {
  Adapter: OverlayAdapterComponent;
  calls: { phase: string; id: string }[];
} {
  const calls: { phase: string; id: string }[] = [];
  const hooks: OverlayAdapterHooks = {
    onOpen: (id) => calls.push({ phase: "onOpen", id }),
    onClosing: (id) => calls.push({ phase: "onClosing", id }),
    onUnmount: (id) => calls.push({ phase: "onUnmount", id }),
  };

  const Adapter: OverlayAdapterComponent = ({ useLifecycle }) => {
    useLifecycle(hooks);
    return null;
  };

  return { Adapter, calls };
}

describe("adapter lifecycle hooks", () => {
  it("calls onOpen once when an item is opened", () => {
    const ctx = createOverlayContext();
    const { Adapter, calls } = createTrackingAdapter();

    let overlayApi: ReturnType<typeof ctx.useOverlay> | undefined;
    function App() {
      overlayApi = ctx.useOverlay();
      return null;
    }

    render(
      <ctx.Provider adapters={{ modal: Adapter }}>
        <App />
      </ctx.Provider>
    );

    act(() => {
      overlayApi!.open({ id: "test", type: "modal" });
    });

    expect(calls).toContainEqual({ phase: "onOpen", id: "test" });
    expect(calls.filter((c) => c.phase === "onOpen")).toHaveLength(1);
  });

  it("calls onClosing when status transitions to closing", () => {
    const ctx = createOverlayContext();
    const { Adapter, calls } = createTrackingAdapter();

    let overlayApi: ReturnType<typeof ctx.useOverlay> | undefined;
    function App() {
      overlayApi = ctx.useOverlay();
      return null;
    }

    render(
      <ctx.Provider adapters={{ modal: Adapter }}>
        <App />
      </ctx.Provider>
    );

    act(() => {
      overlayApi!.open({ id: "test", type: "modal" });
    });

    act(() => {
      overlayApi!.close("test", "done");
    });

    expect(calls).toContainEqual({ phase: "onClosing", id: "test" });
    expect(calls.filter((c) => c.phase === "onClosing")).toHaveLength(1);
  });

  it("calls onUnmount when the item is removed", () => {
    const ctx = createOverlayContext();
    const { Adapter, calls } = createTrackingAdapter();

    let overlayApi: ReturnType<typeof ctx.useOverlay> | undefined;
    function App() {
      overlayApi = ctx.useOverlay();
      return null;
    }

    const { unmount } = render(
      <ctx.Provider adapters={{ modal: Adapter }}>
        <App />
      </ctx.Provider>
    );

    act(() => {
      overlayApi!.open({ id: "test", type: "modal" });
    });

    act(() => {
      overlayApi!.remove("test");
    });

    expect(calls).toContainEqual({ phase: "onUnmount", id: "test" });
    expect(calls.filter((c) => c.phase === "onUnmount")).toHaveLength(1);

    unmount();
  });

  it("does not call onOpen again on re-render without status change", () => {
    const ctx = createOverlayContext();
    const { Adapter, calls } = createTrackingAdapter();

    let overlayApi: ReturnType<typeof ctx.useOverlay> | undefined;
    let renderCount = 0;
    function App() {
      renderCount++;
      overlayApi = ctx.useOverlay();
      return null;
    }

    const { rerender } = render(
      <ctx.Provider adapters={{ modal: Adapter }}>
        <App />
      </ctx.Provider>
    );

    act(() => {
      overlayApi!.open({ id: "test", type: "modal" });
    });

    const openCountAfterOpen = calls.filter((c) => c.phase === "onOpen").length;

    rerender(
      <ctx.Provider adapters={{ modal: Adapter }}>
        <App />
      </ctx.Provider>
    );

    expect(calls.filter((c) => c.phase === "onOpen").length).toBe(openCountAfterOpen);
  });

  it("calls hooks in order: onOpen → onClosing → onUnmount", () => {
    const ctx = createOverlayContext();
    const { Adapter, calls } = createTrackingAdapter();

    let overlayApi: ReturnType<typeof ctx.useOverlay> | undefined;
    function App() {
      overlayApi = ctx.useOverlay();
      return null;
    }

    const { unmount } = render(
      <ctx.Provider adapters={{ modal: Adapter }}>
        <App />
      </ctx.Provider>
    );

    act(() => {
      overlayApi!.open({ id: "test", type: "modal" });
    });

    act(() => {
      overlayApi!.close("test", "done");
    });

    act(() => {
      overlayApi!.remove("test");
    });

    expect(calls.map((c) => c.phase)).toEqual([
      "onOpen",
      "onClosing",
      "onUnmount",
    ]);

    unmount();
  });

  it("does not call any lifecycle hook when adapter does not register hooks", () => {
    const ctx = createOverlayContext();
    const calls: string[] = [];

    const Adapter: OverlayAdapterComponent = ({ useLifecycle }) => {
      // deliberately not calling useLifecycle
      return null;
    };

    let overlayApi: ReturnType<typeof ctx.useOverlay> | undefined;
    function App() {
      overlayApi = ctx.useOverlay();
      return null;
    }

    render(
      <ctx.Provider adapters={{ modal: Adapter }}>
        <App />
      </ctx.Provider>
    );

    act(() => {
      overlayApi!.open({ id: "test", type: "modal" });
    });

    act(() => {
      overlayApi!.close("test");
    });

    act(() => {
      overlayApi!.remove("test");
    });

    expect(calls).toHaveLength(0);
  });
});
