import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { OverlayAdapterComponent } from "../contracts/adapter";
import { createOverlayContext } from "./createOverlayContext";
import { createOverlayStore } from "./createOverlayStore";

function renderOverlay(
  Adapter: OverlayAdapterComponent,
  props: Record<string, unknown>
) {
  const context = createOverlayContext();
  const store = createOverlayStore();
  store.open({ id: "runtime-id", type: "test", props });

  render(
    <context.Provider adapters={{ test: Adapter }} store={store}>
      {null}
    </context.Provider>
  );

  return store;
}

describe("OverlayHost adapter props", () => {
  it("uses the runtime close when item props contain close", () => {
    // Given
    const consumerClose = vi.fn();
    const Adapter: OverlayAdapterComponent = ({ close }) => (
      <button type="button" onClick={() => close("runtime-result")}>
        Close
      </button>
    );
    const store = renderOverlay(Adapter, { close: consumerClose });

    // When
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    // Then
    expect(consumerClose).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toEqual([
      expect.objectContaining({
        closeResult: "runtime-result",
        id: "runtime-id",
        status: "closing",
      }),
    ]);
  });

  it("uses the runtime remove when item props contain remove", () => {
    // Given
    const consumerRemove = vi.fn();
    const Adapter: OverlayAdapterComponent = ({ remove }) => (
      <button type="button" onClick={remove}>
        Remove
      </button>
    );
    const store = renderOverlay(Adapter, { remove: consumerRemove });

    // When
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    // Then
    expect(consumerRemove).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toEqual([]);
  });

  it("uses the runtime isOpen when item props contain isOpen", () => {
    // Given
    const Adapter: OverlayAdapterComponent = ({ isOpen }) => (
      <output data-testid="open-state">{isOpen ? "open" : "closed"}</output>
    );

    // When
    renderOverlay(Adapter, { isOpen: false });

    // Then
    expect(screen.getByTestId("open-state").textContent).toBe("open");
  });

  it("forwards legitimate item props to the adapter", () => {
    // Given
    const style = { color: "red" };
    let receivedClassName: unknown;
    let receivedStyle: unknown;
    const Adapter: OverlayAdapterComponent = (props) => {
      receivedClassName = props["className"];
      receivedStyle = props["style"];
      return null;
    };

    // When
    renderOverlay(Adapter, { className: "notice", style });

    // Then
    expect(receivedClassName).toBe("notice");
    expect(receivedStyle).toBe(style);
  });
});
