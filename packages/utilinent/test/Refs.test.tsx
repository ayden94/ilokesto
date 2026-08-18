import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Observer, Slot } from "../src/index";

function refWithCleanup<T>(cleanup: () => void) {
  return (node: T | null) => (node ? cleanup : undefined);
}

describe("React 19 callback ref cleanup", () => {
  it("runs a Slot callback ref cleanup on unmount", () => {
    const cleanup = vi.fn();
    const rendered = render(
      <Slot ref={refWithCleanup<HTMLElement>(cleanup)}>
        <button type="button">Open</button>
      </Slot>,
    );

    rendered.unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("runs an Observer callback ref cleanup on unmount", () => {
    const cleanup = vi.fn();
    const rendered = render(
      <Observer ref={refWithCleanup<HTMLDivElement>(cleanup)}>Observed</Observer>,
    );

    rendered.unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("runs every cleanup from composed Slot callback refs", () => {
    const slotCleanup = vi.fn();
    const childCleanup = vi.fn();
    const rendered = render(
      <Slot ref={refWithCleanup<HTMLElement>(slotCleanup)}>
        <button ref={refWithCleanup<HTMLButtonElement>(childCleanup)} type="button">
          Open
        </button>
      </Slot>,
    );

    rendered.unmount();

    expect(slotCleanup).toHaveBeenCalledTimes(1);
    expect(childCleanup).toHaveBeenCalledTimes(1);
  });

  it("assigns and clears an object ref composed with a cleanup ref", () => {
    const objectRef = createRef<HTMLElement>();
    const rendered = render(
      <Slot ref={objectRef}>
        <button
          ref={refWithCleanup<HTMLButtonElement>(vi.fn())}
          type="button"
        >
          Open
        </button>
      </Slot>,
    );

    expect(objectRef.current).toBe(screen.getByRole("button", { name: "Open" }));

    rendered.unmount();

    expect(objectRef.current).toBeNull();
  });
});
