import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ClickAway,
  ClientOnly,
  ErrorBoundary,
  Hotkey,
  Hoverable,
  Measure,
  Media,
} from "../src/index";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary fallback="failed">
        <p>ok</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("ok")).toBeInTheDocument();
  });

  it("renders fallback when a child throws", () => {
    function Bomb(): React.ReactNode {
      throw new Error("boom");
    }
    render(
      <ErrorBoundary fallback="failed">
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("failed")).toBeInTheDocument();
  });

  it("exposes error and reset in a render-prop fallback", () => {
    function Bomb(): React.ReactNode {
      throw new Error("boom");
    }
    render(
      <ErrorBoundary
        fallback={({ error, reset }) => (
          <button onClick={reset}>retry: {error.message}</button>
        )}
      >
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("button", { name: "retry: boom" })).toBeInTheDocument();
  });
});

describe("ClientOnly", () => {
  it("renders children after mount", () => {
    render(
      <ClientOnly fallback={<span>loading</span>}>
        <span>client</span>
      </ClientOnly>,
    );
    expect(screen.getByText("client")).toBeInTheDocument();
    expect(screen.queryByText("loading")).not.toBeInTheDocument();
  });
});

describe("Media", () => {
  let matches = false;
  let listeners: Array<(e: MediaQueryListEvent) => void> = [];

  beforeEach(() => {
    matches = false;
    listeners = [];
    window.matchMedia = (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addEventListener: (type: string, listener: (e: MediaQueryListEvent) => void) => {
          if (type === "change") listeners.push(listener);
        },
        removeEventListener: (type: string, listener: (e: MediaQueryListEvent) => void) => {
          if (type === "change") {
            listeners = listeners.filter((l) => l !== listener);
          }
        },
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList;
  });

  it("renders children when the query matches, fallback otherwise", () => {
    const { rerender } = render(
      <Media query="(min-width: 768px)" fallback={<span>mobile</span>}>
        <span>desktop</span>
      </Media>,
    );
    expect(screen.getByText("mobile")).toBeInTheDocument();

    matches = true;
    act(() => {
      for (const l of listeners) {
        l({ matches: true, media: "" } as MediaQueryListEvent);
      }
    });
    rerender(
      <Media query="(min-width: 768px)" fallback={<span>mobile</span>}>
        <span>desktop</span>
      </Media>,
    );
    expect(screen.getByText("desktop")).toBeInTheDocument();
  });

  it("passes matches to a render-prop", () => {
    render(
      <Media query="(min-width: 768px)">
        {(matches) => <span>{matches ? "wide" : "narrow"}</span>}
      </Media>,
    );
    expect(screen.getByText("narrow")).toBeInTheDocument();
  });
});

describe("Measure", () => {
  let active: { emit: (width: number, height: number) => void } | null = null;

  beforeEach(() => {
    active = null;
    class ControlledResizeObserver {
      private target: Element | null = null;
      constructor(private cb: ResizeObserverCallback) {}
      observe(target: Element) {
        this.target = target;
        active = {
          emit: (width: number, height: number) => {
            const rect = { width, height } as DOMRectReadOnly;
            this.cb(
              [{ contentRect: rect, target } as unknown as ResizeObserverEntry],
              this as unknown as ResizeObserver,
            );
          },
        };
      }
      unobserve() {
        this.target = null;
      }
      disconnect() {
        this.target = null;
      }
    }
    globalThis.ResizeObserver =
      ControlledResizeObserver as unknown as typeof ResizeObserver;
  });

  it("passes width and height to the render-prop", () => {
    render(
      <Measure>
        {({ width, height }) => (
          <span>
            {width}x{height}
          </span>
        )}
      </Measure>,
    );

    act(() => {
      active?.emit(100, 50);
    });
    expect(screen.getByText("100x50")).toBeInTheDocument();
  });
});

describe("ClickAway", () => {
  it("calls onClickAway for outside mousedown", () => {
    const onClickAway = vi.fn();
    render(
      <ClickAway onClickAway={onClickAway} data-testid="box">
        inside
      </ClickAway>,
    );

    act(() => {
      screen.getByTestId("box").dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true }),
      );
    });
    expect(onClickAway).not.toHaveBeenCalled();

    act(() => {
      document.body.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true }),
      );
    });
    expect(onClickAway).toHaveBeenCalledTimes(1);
  });
});

describe("Hoverable", () => {
  it("passes isHovering to the render-prop", () => {
    render(
      <Hoverable data-testid="hover">
        {(isHovering) => <span>{isHovering ? "over" : "idle"}</span>}
      </Hoverable>,
    );
    expect(screen.getByText("idle")).toBeInTheDocument();

    act(() => {
      screen.getByTestId("hover").dispatchEvent(
        new MouseEvent("mouseenter", { bubbles: true }),
      );
    });
    expect(screen.getByText("over")).toBeInTheDocument();
  });
});

describe("Hotkey", () => {
  it("invokes onPress for the matching combo and renders nothing", () => {
    const onPress = vi.fn();
    const { container } = render(<Hotkey combo="Escape" onPress={onPress} />);
    expect(container).toBeEmptyDOMElement();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape" }));
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});