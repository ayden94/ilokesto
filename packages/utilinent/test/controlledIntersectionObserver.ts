import { act } from "@testing-library/react";

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

export function installControlledIntersectionObserver() {
  observers.length = 0;
  globalThis.IntersectionObserver = ControlledIntersectionObserver;
}

function getActiveObserver() {
  const observer = [...observers].reverse().find((candidate) => candidate.active);
  if (!observer) {
    throw new Error("Expected an active IntersectionObserver");
  }

  return observer;
}

export function hasActiveIntersectionObserver() {
  return observers.some((observer) => observer.active);
}

export async function emitIntersection(isIntersecting: boolean) {
  const observer = getActiveObserver();

  await act(async () => {
    observer.emit(isIntersecting);
    await Promise.resolve();
  });
}

export async function enterViewport() {
  const observer = getActiveObserver();

  await act(async () => {
    observer.emit(false);
    observer.emit(true);
    await Promise.resolve();
  });
}
