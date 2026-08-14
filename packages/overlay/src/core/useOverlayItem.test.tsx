import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { OverlayProvider, useOverlay, useOverlayItem } from "./OverlayProvider";
import type { OverlayAdapterMap } from "../contracts/adapter";

const stubAdapters: OverlayAdapterMap = {
  modal: () => null,
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <OverlayProvider adapters={stubAdapters}>{children}</OverlayProvider>;
}

describe("useOverlayItem", () => {
  it("returns undefined for non-existent id", () => {
    const { result } = renderHook(() => useOverlayItem("nope"), { wrapper });

    expect(result.current).toBeUndefined();
  });

  it("returns the item after open", () => {
    let overlayApi: ReturnType<typeof useOverlay> | undefined;
    let item: ReturnType<typeof useOverlayItem> | undefined;

    renderHook(
      () => {
        overlayApi = useOverlay();
        item = useOverlayItem("target");
      },
      { wrapper }
    );

    act(() => {
      overlayApi!.open({ id: "target", type: "modal" });
    });

    expect(item?.id).toBe("target");
    expect(item?.status).toBe("open");
  });

  it("reflects status change after close", () => {
    let overlayApi: ReturnType<typeof useOverlay> | undefined;
    let item: ReturnType<typeof useOverlayItem> | undefined;

    renderHook(
      () => {
        overlayApi = useOverlay();
        item = useOverlayItem("target");
      },
      { wrapper }
    );

    act(() => {
      overlayApi!.open({ id: "target", type: "modal" });
    });

    act(() => {
      overlayApi!.close("target", "done");
    });

    expect(item?.status).toBe("closing");
    expect(item?.closeResult).toBe("done");
  });

  it("returns undefined after remove", () => {
    let overlayApi: ReturnType<typeof useOverlay> | undefined;
    let item: ReturnType<typeof useOverlayItem> | undefined;

    renderHook(
      () => {
        overlayApi = useOverlay();
        item = useOverlayItem("target");
      },
      { wrapper }
    );

    act(() => {
      overlayApi!.open({ id: "target", type: "modal" });
    });

    act(() => {
      overlayApi!.remove("target");
    });

    expect(item).toBeUndefined();
  });

  it("does not re-render when an unrelated item is added or removed", () => {
    let overlayApi: ReturnType<typeof useOverlay> | undefined;
    let renderCount = 0;

    renderHook(
      () => {
        const ref = useRef(0);
        ref.current += 1;
        renderCount = ref.current;
        overlayApi = useOverlay();
        useOverlayItem("target");
      },
      { wrapper }
    );

    act(() => {
      overlayApi!.open({ id: "target", type: "modal" });
    });
    const renderCountAfterTargetOpen = renderCount;

    act(() => {
      overlayApi!.open({ id: "unrelated", type: "modal" });
    });

    expect(renderCount).toBe(renderCountAfterTargetOpen);

    act(() => {
      overlayApi!.remove("unrelated");
    });

    expect(renderCount).toBe(renderCountAfterTargetOpen);
  });
});
