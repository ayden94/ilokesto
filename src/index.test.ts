import { describe, it, expect, vi } from "vitest";
import { Store } from "./index";

describe("Store", () => {
  describe("constructor", () => {
    it("stores initial state", () => {
      const store = new Store({ count: 0 });

      expect(store.getState()).toEqual({ count: 0 });
    });
  });

  describe("getState", () => {
    it("returns current state", () => {
      const store = new Store({ value: "initial" });

      expect(store.getState()).toEqual({ value: "initial" });
    });
  });

  describe("getInitialState", () => {
    it("returns the initial state provided in constructor", () => {
      const store = new Store({ count: 5 });

      store.setState({ count: 10 });

      expect(store.getInitialState()).toEqual({ count: 5 });
      expect(store.getState()).toEqual({ count: 10 });
    });
  });

  describe("setState", () => {
    it("replaces state with a direct value", () => {
      const store = new Store({ count: 0 });

      store.setState({ count: 42 });

      expect(store.getState()).toEqual({ count: 42 });
    });

    it("computes next state from updater function", () => {
      const store = new Store({ count: 5 });

      store.setState((prev) => ({ count: prev.count + 1 }));

      expect(store.getState()).toEqual({ count: 6 });
    });

    it("does not notify when same reference is passed", () => {
      const store = new Store({ count: 0 });
      const listener = vi.fn();

      store.subscribe(listener);
      const currentState = store.getState();

      store.setState(currentState);

      expect(listener).not.toHaveBeenCalled();
    });

    it("does not notify when updater returns same reference", () => {
      const store = new Store({ count: 0 });
      const listener = vi.fn();

      store.subscribe(listener);

      store.setState((prev) => prev);

      expect(listener).not.toHaveBeenCalled();
    });

    it("notifies when state changes", () => {
      const store = new Store({ count: 0 });
      const listener = vi.fn();

      store.subscribe(listener);
      store.setState({ count: 1 });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("subscribe", () => {
    it("returns an unsubscribe function", () => {
      const store = new Store({ count: 0 });
      const listener = vi.fn();

      const unsubscribe = store.subscribe(listener);
      unsubscribe();
      store.setState({ count: 1 });

      expect(listener).not.toHaveBeenCalled();
    });

    it("does not immediately notify selector listeners", () => {
      // Given
      const store = new Store({ count: 0 });
      const listener = vi.fn();

      // When
      store.subscribe((state) => state.count, listener);

      // Then
      expect(listener).not.toHaveBeenCalled();
    });

    it("passes next and previous selections to selector listeners", () => {
      // Given
      const store = new Store({ count: 0 });
      const listener = vi.fn();
      store.subscribe((state) => state.count, listener);

      // When
      store.setState({ count: 1 });

      // Then
      expect(listener).toHaveBeenCalledExactlyOnceWith(1, 0);
    });

    it("skips selector notifications when Object.is considers selections equal", () => {
      // Given
      const store = new Store({ value: Number.NaN, revision: 0 });
      const listener = vi.fn();
      store.subscribe((state) => state.value, listener);

      // When
      store.setState({ value: Number.NaN, revision: 1 });

      // Then
      expect(listener).not.toHaveBeenCalled();
    });

    it("uses custom equality to skip equivalent selections", () => {
      // Given
      const store = new Store({ user: { id: "1", name: "Ada" } });
      const listener = vi.fn();
      store.subscribe(
        (state) => state.user,
        listener,
        (previousUser, nextUser) => previousUser.id === nextUser.id
      );

      // When
      store.setState({ user: { id: "1", name: "Grace" } });

      // Then
      expect(listener).not.toHaveBeenCalled();
    });

    it("unsubscribes selector listeners", () => {
      // Given
      const store = new Store({ count: 0 });
      const listener = vi.fn();
      const unsubscribe = store.subscribe((state) => state.count, listener);
      unsubscribe();

      // When
      store.setState({ count: 1 });

      // Then
      expect(listener).not.toHaveBeenCalled();
    });

    it("safely handles selector subscription mutations during notification", () => {
      // Given
      const store = new Store({ count: 0 });
      const secondListener = vi.fn();
      const thirdListener = vi.fn();
      let unsubscribeSecond: () => void = () => undefined;

      store.subscribe((state) => state.count, () => {
        unsubscribeSecond();
        store.subscribe((nextState) => nextState.count, thirdListener);
      });
      unsubscribeSecond = store.subscribe((state) => state.count, secondListener);

      // When
      store.setState({ count: 1 });

      // Then
      expect(secondListener).toHaveBeenCalledTimes(1);
      expect(thirdListener).not.toHaveBeenCalled();
    });

    it("safely handles unsubscribe during notification", () => {
      const store = new Store({ count: 0 });
      const listener1 = vi.fn(() => {});
      const listener2 = vi.fn(() => {
        unsubscribe1();
      });

      const unsubscribe1 = store.subscribe(listener1);
      store.subscribe(listener2);

      store.setState({ count: 1 });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      store.setState({ count: 2 });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(2);
    });

    it("supports multiple listeners", () => {
      const store = new Store({ count: 0 });
      const l1 = vi.fn();
      const l2 = vi.fn();

      store.subscribe(l1);
      store.subscribe(l2);
      store.setState({ count: 1 });

      expect(l1).toHaveBeenCalledTimes(1);
      expect(l2).toHaveBeenCalledTimes(1);
    });
  });

  describe("pushMiddleware", () => {
    it("wraps setState in middleware execution order", () => {
      const store = new Store({ count: 0 });
      const order: string[] = [];

      store.pushMiddleware((nextState, next) => {
        order.push("before-1");
        next(nextState);
        order.push("after-1");
      });

      store.pushMiddleware((nextState, next) => {
        order.push("before-2");
        next(nextState);
        order.push("after-2");
      });

      store.setState({ count: 1 });

      expect(order).toEqual([
        "before-1",
        "before-2",
        "after-2",
        "after-1",
      ]);
    });

    it("middleware can transform state", () => {
      const store = new Store({ count: 0 });

      store.pushMiddleware((nextState, next) => {
        if (typeof nextState === "object" && nextState !== null) {
          next({ count: (nextState as { count: number }).count * 10 });
          return;
        }
        next(nextState);
      });

      store.setState({ count: 5 });

      expect(store.getState()).toEqual({ count: 50 });
    });
  });

  describe("unshiftMiddleware", () => {
    it("adds middleware to the beginning of the chain", () => {
      const store = new Store({ count: 0 });
      const order: string[] = [];

      store.pushMiddleware((nextState, next) => {
        order.push("pushed");
        next(nextState);
      });

      store.unshiftMiddleware((nextState, next) => {
        order.push("unshifted");
        next(nextState);
      });

      store.setState({ count: 1 });

      expect(order).toEqual(["unshifted", "pushed"]);
    });
  });

  describe("middleware + subscribe interaction", () => {
    it("notifies after middleware chain completes", () => {
      const store = new Store({ count: 0 });
      const order: string[] = [];

      store.pushMiddleware((nextState, next) => {
        order.push("middleware-before");
        next(nextState);
        order.push("middleware-after");
      });

      store.subscribe(() => {
        order.push("listener");
      });

      store.setState({ count: 1 });

      expect(order).toEqual([
        "middleware-before",
        "listener",
        "middleware-after",
      ]);
    });
  });

  describe("runner caching", () => {
    it("caches runner and invalidates on pushMiddleware", () => {
      const store = new Store({ count: 0 });
      const order: string[] = [];

      store.setState({ count: 1 });
      expect(store.getState()).toEqual({ count: 1 });

      store.pushMiddleware((nextState, next) => {
        order.push("mw");
        next(nextState);
      });

      store.setState({ count: 2 });
      expect(order).toEqual(["mw"]);
      expect(store.getState()).toEqual({ count: 2 });
    });

    it("caches runner and invalidates on unshiftMiddleware", () => {
      const store = new Store({ count: 0 });
      const order: string[] = [];

      store.setState({ count: 1 });

      store.unshiftMiddleware((nextState, next) => {
        order.push("mw");
        next(nextState);
      });

      store.setState({ count: 2 });
      expect(order).toEqual(["mw"]);
    });

    it("fast path works without middleware", () => {
      const store = new Store({ count: 0 });

      store.setState({ count: 1 });
      store.setState({ count: 2 });
      store.setState((prev) => ({ count: prev.count + 1 }));

      expect(store.getState()).toEqual({ count: 3 });
    });
  });
});
