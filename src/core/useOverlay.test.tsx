import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { OverlayProvider } from "./OverlayProvider";
import { useOverlay } from "./useOverlay";
import { useOverlayItems } from "./useOverlayItems";
import type { OverlayAdapterMap } from "../contracts/adapter";

const stubAdapters: OverlayAdapterMap = {
  modal: () => null,
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <OverlayProvider adapters={stubAdapters}>{children}</OverlayProvider>;
}

describe("useOverlay", () => {
  it("returns display, open, close, reject, remove, clear", () => {
    const { result } = renderHook(() => useOverlay(), { wrapper });

    expect(result.current.display).toBeInstanceOf(Function);
    expect(result.current.open).toBeInstanceOf(Function);
    expect(result.current.close).toBeInstanceOf(Function);
    expect(result.current.reject).toBeInstanceOf(Function);
    expect(result.current.remove).toBeInstanceOf(Function);
    expect(result.current.clear).toBeInstanceOf(Function);
  });

  it("display returns a Promise", () => {
    const { result } = renderHook(() => useOverlay(), { wrapper });

    let promise: Promise<unknown> | undefined;
    act(() => {
      promise = result.current.display({ type: "modal" });
    });

    expect(promise).toBeInstanceOf(Promise);
  });

  it("reject calls store.reject and transitions item to closing", () => {
    let id: string | undefined;
    let overlayApi: ReturnType<typeof useOverlay> | undefined;
    let items: ReturnType<typeof useOverlayItems> | undefined;

    renderHook(
      () => {
        overlayApi = useOverlay();
        items = useOverlayItems();
      },
      { wrapper }
    );

    act(() => {
      id = overlayApi!.open({ type: "modal" });
    });

    act(() => {
      overlayApi!.reject(id!, "reason");
    });

    const item = items!.find((i) => i.id === id);
    expect(item?.status).toBe("closing");
    expect(item?.rejected).toBe(true);
    expect(item?.rejectReason).toBe("reason");
  });
});