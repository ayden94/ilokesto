import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createOverlayContext } from "./createOverlayContext";
import type { OverlayAdapterMap } from "../contracts/adapter";

const stubAdapters: OverlayAdapterMap = {
  modal: () => null,
};

describe("createOverlayContext", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });
  it("returns Provider, useOverlay, useOverlayItems, useOverlayItem", () => {
    const ctx = createOverlayContext();

    expect(typeof ctx.Provider).toBe("function");
    expect(typeof ctx.useOverlay).toBe("function");
    expect(typeof ctx.useOverlayItems).toBe("function");
    expect(typeof ctx.useOverlayItem).toBe("function");
  });

  it("two contexts are isolated — items do not cross", () => {
    const ctxA = createOverlayContext();
    const ctxB = createOverlayContext();

    let aItems: ReturnType<typeof ctxA.useOverlayItems> = [];
    let bItems: ReturnType<typeof ctxB.useOverlayItems> = [];
    let aOverlay: ReturnType<typeof ctxA.useOverlay> | undefined;
    let bOverlay: ReturnType<typeof ctxB.useOverlay> | undefined;

    renderHook(
      () => {
        aOverlay = ctxA.useOverlay();
        aItems = ctxA.useOverlayItems();
      },
      {
        wrapper: ({ children }) => (
          <ctxA.Provider adapters={stubAdapters}>{children}</ctxA.Provider>
        ),
      }
    );

    renderHook(
      () => {
        bOverlay = ctxB.useOverlay();
        bItems = ctxB.useOverlayItems();
      },
      {
        wrapper: ({ children }) => (
          <ctxB.Provider adapters={stubAdapters}>{children}</ctxB.Provider>
        ),
      }
    );

    act(() => {
      aOverlay!.open({ id: "a-modal", type: "modal" });
    });

    expect(aItems).toHaveLength(1);
    expect(bItems).toHaveLength(0);

    act(() => {
      bOverlay!.open({ id: "b-modal", type: "modal" });
    });

    expect(aItems).toHaveLength(1);
    expect(bItems).toHaveLength(1);

    expect(aItems[0].id).toBe("a-modal");
    expect(bItems[0].id).toBe("b-modal");
  });

  it("throws when useOverlay is called outside Provider", () => {
    const ctx = createOverlayContext();

    expect(() =>
      renderHook(() => ctx.useOverlay())
    ).toThrow(
      "useOverlay must be used within an <OverlayProvider>."
    );
  });

  it("useOverlayItem works within a created context", () => {
    const ctx = createOverlayContext();
    let overlayApi: ReturnType<typeof ctx.useOverlay> | undefined;
    let item: ReturnType<typeof ctx.useOverlayItem> | undefined;

    renderHook(
      () => {
        overlayApi = ctx.useOverlay();
        item = ctx.useOverlayItem("target");
      },
      {
        wrapper: ({ children }) => (
          <ctx.Provider adapters={stubAdapters}>{children}</ctx.Provider>
        ),
      }
    );

    act(() => {
      overlayApi!.open({ id: "target", type: "modal" });
    });

    expect(item?.id).toBe("target");
    expect(item?.status).toBe("open");
  });
});
