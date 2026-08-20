import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OptionalWrapper, Observer } from "../src/index";
import {
  emitIntersection,
  installControlledIntersectionObserver,
} from "./controlledIntersectionObserver";

describe("useIntersectionObserver onIntersect", () => {
  beforeEach(installControlledIntersectionObserver);

  it("invokes the canonical onIntersect option on intersection", async () => {
    const onIntersect = vi.fn();
    render(<Observer onIntersect={onIntersect}>visible</Observer>);

    await emitIntersection(true);

    expect(onIntersect).toHaveBeenCalledTimes(1);
    expect(onIntersect).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ isIntersecting: true }),
    );
  });
});

describe("Observer keepMeasurable", () => {
  beforeEach(installControlledIntersectionObserver);

  it("does not force measurable styles by default", () => {
    const { container } = render(<Observer fallback="pending">content</Observer>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.minWidth).toBe("");
    expect(el.style.minHeight).toBe("");
    expect(el.style.display).toBe("");
  });

  it("forces a measurable box when keepMeasurable is set", () => {
    const { container } = render(
      <Observer fallback="pending" keepMeasurable>
        content
      </Observer>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.minWidth).toBe("1px");
    expect(el.style.minHeight).toBe("1px");
    expect(el.style.display).toBe("block");
  });
});

describe("OptionalWrapper elseWrapper", () => {
  it("wraps with wrapper when true and elseWrapper when false", () => {
    const { rerender, container } = render(
      <OptionalWrapper
        when={true}
        wrapper={(c) => <strong>{c}</strong>}
        elseWrapper={(c) => <em>{c}</em>}
      >
        hi
      </OptionalWrapper>,
    );
    expect(container.querySelector("strong")?.textContent).toBe("hi");

    rerender(
      <OptionalWrapper
        when={false}
        wrapper={(c) => <strong>{c}</strong>}
        elseWrapper={(c) => <em>{c}</em>}
      >
        hi
      </OptionalWrapper>,
    );
    expect(container.querySelector("em")?.textContent).toBe("hi");
  });

  it("falls back to the deprecated fallback alias", () => {
    const { container } = render(
      <OptionalWrapper when={false} wrapper={(c) => <strong>{c}</strong>} fallback={(c) => <em>{c}</em>}>
        hi
      </OptionalWrapper>,
    );
    expect(container.querySelector("em")?.textContent).toBe("hi");
  });
});