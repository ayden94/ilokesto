import { StrictMode } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOverlayContext } from "./createOverlayContext";
import { createOverlayStore } from "./createOverlayStore";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("missing overlay adapters", () => {
  it("reports a development diagnostic once per mounted item identity", () => {
    // Given
    vi.stubEnv("NODE_ENV", "development");
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const context = createOverlayContext();
    const store = createOverlayStore();
    store.open({ id: "missing-item", type: "missing-type" });

    // When
    const view = render(
      <StrictMode>
        <context.Provider adapters={{}} store={store}>
          <div />
        </context.Provider>
      </StrictMode>
    );
    view.rerender(
      <StrictMode>
        <context.Provider adapters={{}} store={store}>
          <div />
        </context.Provider>
      </StrictMode>
    );
    act(() => {
      store.close("missing-item");
    });

    // Then
    expect(diagnostic).toHaveBeenCalledTimes(1);
    expect(diagnostic.mock.calls[0]?.[1]).toEqual({
      id: "missing-item",
      type: "missing-type",
    });
  });

  it("reports each new missing item", () => {
    // Given
    vi.stubEnv("NODE_ENV", "development");
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const context = createOverlayContext();
    const store = createOverlayStore();
    render(<context.Provider adapters={{}} store={store}>{null}</context.Provider>);

    // When
    act(() => {
      store.open({ id: "first-item", type: "first-type" });
    });
    act(() => {
      store.open({ id: "second-item", type: "second-type" });
    });

    // Then
    expect(diagnostic).toHaveBeenCalledTimes(2);
    expect(diagnostic.mock.calls.map((call) => call[1])).toEqual([
      { id: "first-item", type: "first-type" },
      { id: "second-item", type: "second-type" },
    ]);
  });

  it("reports an item again when the same id is removed and remounted", () => {
    // Given
    vi.stubEnv("NODE_ENV", "development");
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const context = createOverlayContext();
    const store = createOverlayStore();
    render(<context.Provider adapters={{}} store={store}>{null}</context.Provider>);

    // When
    act(() => {
      store.open({ id: "reused-item", type: "missing-type" });
    });
    act(() => {
      store.remove("reused-item");
    });
    act(() => {
      store.open({ id: "reused-item", type: "missing-type" });
    });

    // Then
    expect(diagnostic).toHaveBeenCalledTimes(2);
    expect(diagnostic.mock.calls.map((call) => call[1])).toEqual([
      { id: "reused-item", type: "missing-type" },
      { id: "reused-item", type: "missing-type" },
    ]);
  });

  it.each(["production", "staging"])(
    "stays silent and leaves a missing item pending in %s",
    async (nodeEnv) => {
      // Given
      vi.stubEnv("NODE_ENV", nodeEnv);
      const diagnostic = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const resolved = vi.fn();
      const rejected = vi.fn();
      const context = createOverlayContext();
      const store = createOverlayStore();
      const request = store.open({ id: "production-item", type: "missing-type" });
      void request.promise.then(resolved, rejected);

      // When
      const { container } = render(
        <context.Provider adapters={{}} store={store}>{null}</context.Provider>
      );
      await act(async () => {
        await Promise.resolve();
      });

      // Then
      expect(diagnostic).not.toHaveBeenCalled();
      expect(container).toBeEmptyDOMElement();
      expect(store.getSnapshot()).toEqual([
        expect.objectContaining({
          id: "production-item",
          status: "open",
          type: "missing-type",
        }),
      ]);
      expect(resolved).not.toHaveBeenCalled();
      expect(rejected).not.toHaveBeenCalled();
    }
  );
});
