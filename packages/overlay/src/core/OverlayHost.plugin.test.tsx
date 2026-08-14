import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { createOverlayContext } from "./createOverlayContext";
import type { OverlayAdapterComponent } from "../contracts/adapter";
import type { OverlayPlugin } from "../contracts/plugin";

describe("adapter plugins", () => {
  it("plugin hooks fire when adapter does not register its own hooks", () => {
    const ctx = createOverlayContext();
    const calls: { phase: string; id: string }[] = [];

    const plugin: OverlayPlugin = {
      name: "logging",
      onOpen: (id) => calls.push({ phase: "onOpen", id }),
      onClosing: (id) => calls.push({ phase: "onClosing", id }),
      onUnmount: (id) => calls.push({ phase: "onUnmount", id }),
    };

    const Adapter: OverlayAdapterComponent = () => null;

    let overlayApi: ReturnType<typeof ctx.useOverlay> | undefined;
    function App() {
      overlayApi = ctx.useOverlay();
      return null;
    }

    const { unmount } = render(
      <ctx.Provider adapters={{ modal: Adapter }} plugins={[plugin]}>
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

    expect(calls.map((c) => c.phase)).toEqual([
      "onOpen",
      "onClosing",
      "onUnmount",
    ]);

    unmount();
  });

  it("adapter hooks take priority over plugin hooks for the same phase", () => {
    const ctx = createOverlayContext();
    const pluginCalls: string[] = [];
    const adapterCalls: string[] = [];

    const plugin: OverlayPlugin = {
      name: "logging",
      onOpen: () => pluginCalls.push("plugin-onOpen"),
      onClosing: () => pluginCalls.push("plugin-onClosing"),
      onUnmount: () => pluginCalls.push("plugin-onUnmount"),
    };

    const Adapter: OverlayAdapterComponent = ({ useLifecycle }) => {
      useLifecycle({
        onOpen: () => adapterCalls.push("adapter-onOpen"),
        onClosing: () => adapterCalls.push("adapter-onClosing"),
        onUnmount: () => adapterCalls.push("adapter-onUnmount"),
      });
      return null;
    };

    let overlayApi: ReturnType<typeof ctx.useOverlay> | undefined;
    function App() {
      overlayApi = ctx.useOverlay();
      return null;
    }

    const { unmount } = render(
      <ctx.Provider adapters={{ modal: Adapter }} plugins={[plugin]}>
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

    expect(adapterCalls).toEqual([
      "adapter-onOpen",
      "adapter-onClosing",
      "adapter-onUnmount",
    ]);
    expect(pluginCalls).toEqual([]);

    unmount();
  });

  it("multiple plugins fire in registration order", () => {
    const ctx = createOverlayContext();
    const order: string[] = [];

    const pluginA: OverlayPlugin = {
      name: "a",
      onOpen: () => order.push("a-onOpen"),
    };
    const pluginB: OverlayPlugin = {
      name: "b",
      onOpen: () => order.push("b-onOpen"),
    };

    const Adapter: OverlayAdapterComponent = () => null;

    let overlayApi: ReturnType<typeof ctx.useOverlay> | undefined;
    function App() {
      overlayApi = ctx.useOverlay();
      return null;
    }

    const { unmount } = render(
      <ctx.Provider adapters={{ modal: Adapter }} plugins={[pluginA, pluginB]}>
        <App />
      </ctx.Provider>
    );

    act(() => {
      overlayApi!.open({ id: "test", type: "modal" });
    });

    expect(order).toEqual(["a-onOpen", "b-onOpen"]);

    unmount();
  });

  it("works with no plugins (backward compatible)", () => {
    const ctx = createOverlayContext();
    const Adapter: OverlayAdapterComponent = () => null;

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

    expect(overlayApi).toBeDefined();

    unmount();
  });

  it("adapter can register hooks for some phases, plugin fills the rest", () => {
    const ctx = createOverlayContext();
    const pluginCalls: string[] = [];

    const plugin: OverlayPlugin = {
      name: "partial-fallback",
      onOpen: () => pluginCalls.push("plugin-onOpen"),
      onClosing: () => pluginCalls.push("plugin-onClosing"),
      onUnmount: () => pluginCalls.push("plugin-onUnmount"),
    };

    const Adapter: OverlayAdapterComponent = ({ useLifecycle }) => {
      useLifecycle({
        onOpen: () => {}, // adapter handles onOpen only
      });
      return null;
    };

    let overlayApi: ReturnType<typeof ctx.useOverlay> | undefined;
    function App() {
      overlayApi = ctx.useOverlay();
      return null;
    }

    const { unmount } = render(
      <ctx.Provider adapters={{ modal: Adapter }} plugins={[plugin]}>
        <App />
      </ctx.Provider>
    );

    act(() => {
      overlayApi!.open({ id: "test", type: "modal" });
    });

    // adapter registered onOpen, so plugin's onOpen should NOT fire
    expect(pluginCalls).not.toContain("plugin-onOpen");

    act(() => {
      overlayApi!.close("test");
    });

    // adapter did NOT register onClosing, so plugin's onClosing SHOULD fire
    expect(pluginCalls).toContain("plugin-onClosing");

    act(() => {
      overlayApi!.remove("test");
    });

    // adapter did NOT register onUnmount, so plugin's onUnmount SHOULD fire
    expect(pluginCalls).toContain("plugin-onUnmount");

    unmount();
  });
});
