import { describe, it, expect } from "bun:test";
import { shallow } from "../src/core/shared/shallow.js";

describe("shallow", () => {
  it("returns true for identical primitives", () => {
    expect(shallow(1, 1)).toBe(true);
    expect(shallow("a", "a")).toBe(true);
    expect(shallow(true, true)).toBe(true);
    expect(shallow(null, null)).toBe(true);
    expect(shallow(undefined, undefined)).toBe(true);
  });

  it("returns false for different primitives", () => {
    expect(shallow(1, 2)).toBe(false);
    expect(shallow("a", "b")).toBe(false);
    expect(shallow(true, false)).toBe(false);
  });

  it("returns true for same reference objects", () => {
    const obj = { a: 1 };
    expect(shallow(obj, obj)).toBe(true);
  });

  it("returns true for shallow-equal objects", () => {
    expect(shallow({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it("returns false for shallow-unequal objects", () => {
    expect(shallow({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
  });

  it("returns false for different keys", () => {
    expect(shallow({ a: 1 }, { b: 1 })).toBe(false);
  });

  it("returns false for different key count", () => {
    expect(shallow({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("does deep comparison of nested objects (uses Object.is for values)", () => {
    const nested = { inner: 1 };
    expect(shallow({ a: nested }, { a: nested })).toBe(true);
    expect(shallow({ a: { inner: 1 } }, { a: { inner: 1 } })).toBe(false);
  });

  it("returns true for shallow-equal arrays", () => {
    expect(shallow([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it("returns false for arrays with different values", () => {
    expect(shallow([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  it("returns false for arrays with different length", () => {
    expect(shallow([1, 2], [1, 2, 3])).toBe(false);
  });

  it("compares Map entries shallowly", () => {
    const mapA = new Map([["a", 1], ["b", 2]]);
    const mapB = new Map([["a", 1], ["b", 2]]);
    expect(shallow(mapA, mapB)).toBe(true);
  });

  it("returns false for Map with different values", () => {
    const mapA = new Map([["a", 1]]);
    const mapB = new Map([["a", 2]]);
    expect(shallow(mapA, mapB)).toBe(false);
  });

  it("returns false for Map with different size", () => {
    const mapA = new Map([["a", 1]]);
    const mapB = new Map([["a", 1], ["b", 2]]);
    expect(shallow(mapA, mapB)).toBe(false);
  });

  it("compares Set values shallowly", () => {
    const setA = new Set([1, 2, 3]);
    const setB = new Set([1, 2, 3]);
    expect(shallow(setA, setB)).toBe(true);
  });

  it("returns false for Set with different values", () => {
    const setA = new Set([1, 2, 3]);
    const setB = new Set([1, 2, 4]);
    expect(shallow(setA, setB)).toBe(false);
  });

  it("returns false for Set with different size", () => {
    const setA = new Set([1, 2]);
    const setB = new Set([1, 2, 3]);
    expect(shallow(setA, setB)).toBe(false);
  });

  it("returns true for Date with same prototype (shallow limitation — use getTime() in selector)", () => {
    const dateA = new Date(2024, 0, 1);
    const dateB = new Date(2024, 0, 2);
    expect(shallow(dateA, dateB)).toBe(true);
  });

  it("returns true for Date with same time", () => {
    const dateA = new Date(2024, 0, 1);
    const dateB = new Date(2024, 0, 1);
    expect(shallow(dateA, dateB)).toBe(true);
  });

  it("returns false for different prototypes", () => {
    expect(shallow({} as unknown, [] as unknown)).toBe(false);
    expect(shallow(new Map() as unknown, new Set() as unknown)).toBe(false);
  });

  it("handles circular references safely (shallow only)", () => {
    const a: Record<string, unknown> = { x: 1 };
    a.self = a;
    const b: Record<string, unknown> = { x: 1 };
    b.self = b;

    expect(() => shallow(a, b)).not.toThrow();
  });
});