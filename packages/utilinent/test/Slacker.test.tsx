import { StrictMode, type ComponentProps } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Slacker } from "../src/index";

const observers: ControlledIntersectionObserver[] = [];

class ControlledIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin: string;
  readonly thresholds: readonly number[];
  private target: Element | null = null;

  constructor(
    private readonly callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {},
  ) {
    this.rootMargin = options.rootMargin ?? "0px";
    this.thresholds = Array.isArray(options.threshold)
      ? options.threshold
      : [options.threshold ?? 0];
    observers.push(this);
  }

  observe(target: Element) {
    this.target = target;
  }

  unobserve(target: Element) {
    if (this.target === target) {
      this.target = null;
    }
  }

  disconnect() {
    this.target = null;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  emit(isIntersecting: boolean) {
    if (!this.target) {
      return;
    }

    const rect = new DOMRectReadOnly();
    const entry: IntersectionObserverEntry = {
      boundingClientRect: rect,
      intersectionRatio: isIntersecting ? 1 : 0,
      intersectionRect: rect,
      isIntersecting,
      rootBounds: null,
      target: this.target,
      time: 0,
    };
    this.callback([entry], this);
  }

  get active() {
    return this.target !== null;
  }
}

function activeObserver() {
  const observer = [...observers].reverse().find((candidate) => candidate.active);
  if (!observer) {
    throw new Error("Expected an active IntersectionObserver");
  }
  return observer;
}

async function enterViewport() {
  await act(async () => {
    const observer = activeObserver();
    observer.emit(false);
    observer.emit(true);
    await Promise.resolve();
  });
}

async function advanceTimer(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

type StringSlackerProps = Omit<ComponentProps<typeof Slacker<string>>, "children">;

function stringSlacker(props: StringSlackerProps) {
  return <Slacker {...props}>{(value) => <p>{value}</p>}</Slacker>;
}

describe("Slacker retry lifecycle", () => {
  beforeEach(() => {
    observers.length = 0;
    globalThis.IntersectionObserver = ControlledIntersectionObserver;
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts exactly one initial attempt after intersection in StrictMode", async () => {
    const loader = vi.fn<() => Promise<string>>().mockResolvedValue("loaded");

    render(
      <StrictMode>
        {stringSlacker({ loader })}
      </StrictMode>,
    );
    expect(loader).not.toHaveBeenCalled();

    await enterViewport();

    expect(loader).toHaveBeenCalledTimes(1);
    expect(screen.getByText("loaded")).toBeInTheDocument();
  });

  it("defers a zero-delay retry until the timer boundary", async () => {
    const loader = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("first failure"))
      .mockResolvedValue("loaded");

    render(stringSlacker({ loader, maxRetries: 1, retryDelay: 0 }));
    await enterViewport();

    expect(loader).toHaveBeenCalledTimes(1);

    await advanceTimer(0);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(screen.getByText("loaded")).toBeInTheDocument();
  });

  it("waits for the complete retry delay", async () => {
    const loader = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("first failure"))
      .mockResolvedValue("loaded");

    render(stringSlacker({ loader, maxRetries: 1, retryDelay: 1000 }));
    await enterViewport();

    await advanceTimer(999);
    expect(loader).toHaveBeenCalledTimes(1);

    await advanceTimer(1);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("does not retry when maxRetries is zero", async () => {
    const onError = vi.fn();
    const loader = vi.fn<() => Promise<string>>().mockRejectedValue(new Error("failure"));

    render(stringSlacker({ loader, maxRetries: 0, onError }));
    await enterViewport();
    await advanceTimer(5000);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("stops after the configured additional attempts", async () => {
    const onError = vi.fn();
    const loader = vi.fn<() => Promise<string>>().mockRejectedValue(new Error("failure"));

    render(stringSlacker({ loader, maxRetries: 2, retryDelay: 100, onError }));
    await enterViewport();
    await advanceTimer(100);
    await advanceTimer(100);
    await advanceTimer(1000);

    expect(loader).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalledTimes(3);
  });

  it("cancels the automatic retry when a manual retry succeeds", async () => {
    const loader = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("failure"))
      .mockResolvedValue("loaded");

    render(
      stringSlacker({
        loader,
        maxRetries: 1,
        retryDelay: 1000,
        errorFallback: ({ retry }) => <button onClick={retry}>Retry</button>,
      }),
    );
    await enterViewport();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await act(async () => Promise.resolve());
    await advanceTimer(1000);

    expect(loader).toHaveBeenCalledTimes(2);
    expect(screen.getByText("loaded")).toBeInTheDocument();
  });

  it("coalesces rapid manual retries with the in-flight attempt", async () => {
    const retryAttempt = createDeferred<string>();
    const loader = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("failure"))
      .mockImplementation(() => retryAttempt.promise);

    render(
      stringSlacker({
        loader,
        maxRetries: 2,
        retryDelay: 1000,
        errorFallback: ({ retry }) => <button onClick={retry}>Retry</button>,
      }),
    );
    await enterViewport();
    const retryButton = screen.getByRole("button", { name: "Retry" });

    act(() => {
      retryButton.click();
      retryButton.click();
      retryButton.click();
    });
    await act(async () => Promise.resolve());

    expect(loader).toHaveBeenCalledTimes(2);
    retryAttempt.resolve("loaded");
    await act(async () => Promise.resolve());
    await advanceTimer(1000);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("invalidates pending timers and settlements when the loader is replaced", async () => {
    const oldAttempt = createDeferred<string>();
    const oldLoader = vi.fn(() => oldAttempt.promise);
    const middleLoader = vi.fn<() => Promise<string>>().mockRejectedValue(new Error("failure"));
    const newLoader = vi.fn<() => Promise<string>>().mockResolvedValue("new data");
    const rendered = render(
      stringSlacker({ loader: oldLoader, maxRetries: 1, retryDelay: 1000 }),
    );
    await enterViewport();

    rendered.rerender(
      stringSlacker({ loader: middleLoader, maxRetries: 1, retryDelay: 1000 }),
    );
    await act(async () => Promise.resolve());
    oldAttempt.resolve("old data");
    await act(async () => Promise.resolve());

    rendered.rerender(
      stringSlacker({ loader: newLoader, maxRetries: 1, retryDelay: 1000 }),
    );
    await act(async () => Promise.resolve());
    await advanceTimer(1000);

    expect(oldLoader).toHaveBeenCalledTimes(1);
    expect(middleLoader).toHaveBeenCalledTimes(1);
    expect(newLoader).toHaveBeenCalledTimes(1);
    expect(screen.getByText("new data")).toBeInTheDocument();
    expect(screen.queryByText("old data")).not.toBeInTheDocument();
  });

  it("ignores a failed settlement after unmount", async () => {
    const pendingAttempt = createDeferred<string>();
    const onError = vi.fn();
    const loader = vi.fn(() => pendingAttempt.promise);
    const rendered = render(stringSlacker({ loader, maxRetries: 1, onError }));
    await enterViewport();

    rendered.unmount();
    pendingAttempt.reject(new Error("late failure"));
    await act(async () => Promise.resolve());
    await advanceTimer(1000);

    expect(onError).not.toHaveBeenCalled();
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
