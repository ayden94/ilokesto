import { describe, it, expect } from "vitest";
import { render, act } from "@testing-library/react";
import { useState } from "react";
import { createOverlayStore } from "./createOverlayStore";
import { createOverlayContext } from "./createOverlayContext";
import type { OverlayAdapterComponent } from "../contracts/adapter";

describe("open before Provider mount", () => {
  it("renders items that were opened before Provider mounted", () => {
    const store = createOverlayStore();
    const ctx = createOverlayContext();
    const renderedIds: string[] = [];

    const Adapter: OverlayAdapterComponent = ({ id }) => {
      renderedIds.push(id);
      return null;
    };

    act(() => {
      store.open({ id: "early-item", type: "modal" });
    });

    expect(store.getSnapshot()).toHaveLength(1);
    expect(store.getSnapshot()[0].id).toBe("early-item");

    function App() {
      const [mounted] = useState(true);
      return (
        <>
          {mounted && (
            <ctx.Provider adapters={{ modal: Adapter }} store={store}>
              <div>app</div>
            </ctx.Provider>
          )}
        </>
      );
    }

    render(<App />);

    expect(renderedIds).toContain("early-item");
  });

  it("renders items when Provider mounts after a delay", () => {
    const store = createOverlayStore();
    const ctx = createOverlayContext();
    const renderedIds: string[] = [];

    const Adapter: OverlayAdapterComponent = ({ id }) => {
      renderedIds.push(id);
      return null;
    };

    act(() => {
      store.open({ id: "delayed-item", type: "modal" });
    });

    function App() {
      const [providerMounted, setProviderMounted] = useState(false);

      if (!providerMounted) {
        return (
          <button onClick={() => setProviderMounted(true)}>mount</button>
        );
      }

      return (
        <ctx.Provider adapters={{ modal: Adapter }} store={store}>
          <div>app</div>
        </ctx.Provider>
      );
    }

    const { container } = render(<App />);

    expect(renderedIds).not.toContain("delayed-item");

    const button = container.querySelector("button")!;
    act(() => {
      button.click();
    });

    expect(renderedIds).toContain("delayed-item");
  });
});