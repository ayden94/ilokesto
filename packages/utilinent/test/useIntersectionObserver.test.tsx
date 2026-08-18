import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Observer } from "../src";
import { useIntersectionObserver } from "../src/hooks/useIntersectionObserver";
import {
  emitIntersection,
  hasActiveIntersectionObserver,
  installControlledIntersectionObserver,
} from "./controlledIntersectionObserver";

type IntersectionChangeHandler = (
  isIntersecting: boolean,
  entry: IntersectionObserverEntry,
) => void;

type IntersectionProbeProps = {
  readonly onChange: IntersectionChangeHandler;
};

function IntersectionProbe({ onChange }: IntersectionProbeProps) {
  const { ref } = useIntersectionObserver({ onChange });
  return <div ref={ref} />;
}

describe("useIntersectionObserver", () => {
  beforeEach(installControlledIntersectionObserver);

  it("notifies when the initial observer record is intersecting", async () => {
    const onChange = vi.fn<IntersectionChangeHandler>();
    render(<IntersectionProbe onChange={onChange} />);

    await emitIntersection(true);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ isIntersecting: true, intersectionRatio: 1 }),
    );
  });

  it("freezes and disconnects a triggerOnce observer on an initially visible record", async () => {
    const onIntersect = vi.fn<IntersectionChangeHandler>();
    const rendered = render(
      <Observer triggerOnce={true} onIntersect={onIntersect} threshold={0}>
        visible
      </Observer>,
    );

    await emitIntersection(true);

    expect(onIntersect).toHaveBeenCalledTimes(1);
    expect(hasActiveIntersectionObserver()).toBe(false);

    rendered.rerender(
      <Observer triggerOnce={true} onIntersect={onIntersect} threshold={0.5}>
        visible
      </Observer>,
    );
    expect(hasActiveIntersectionObserver()).toBe(false);
  });

  it("notifies only on later non-intersecting to intersecting transitions", async () => {
    const onChange = vi.fn<IntersectionChangeHandler>();
    render(<IntersectionProbe onChange={onChange} />);

    await emitIntersection(false);
    await emitIntersection(true);
    await emitIntersection(true);
    await emitIntersection(false);
    await emitIntersection(true);

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls.map(([isIntersecting]) => isIntersecting)).toEqual([
      true,
      true,
    ]);
  });
});
