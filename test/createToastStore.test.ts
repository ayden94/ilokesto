import { describe, it, expect, vi } from "vitest";
import { createToastStore } from "../src/core/createToastStore";
import type { ToastItem } from "../src/types/toast";

function createTestItem(overrides: Partial<ToastItem> = {}): ToastItem {
  return {
    id: "test-1",
    type: "blank",
    message: "Hello",
    status: "visible",
    createdAt: Date.now(),
    toasterId: "default",
    duration: 4000,
    position: "top-right",
    height: null,
    pauseDuration: 0,
    pausedAt: null,
    ariaProps: { role: "status", "aria-live": "polite", "aria-atomic": true },
    ...overrides,
  };
}

describe("createToastStore", () => {
  describe("add", () => {
    it("adds a new item to the store", () => {
      const store = createToastStore();
      const item = createTestItem();

      store.add(item);

      expect(store.getSnapshot()).toHaveLength(1);
      expect(store.getSnapshot()[0].id).toBe("test-1");
    });

    it("merges when adding with an existing id", () => {
      const store = createToastStore();
      store.add(createTestItem({ id: "dup", message: "first" }));
      store.add(createTestItem({ id: "dup", message: "second", type: "success" }));

      const items = store.getSnapshot();
      expect(items).toHaveLength(1);
      expect(items[0].message).toBe("second");
      expect(items[0].type).toBe("success");
      expect(items[0].toasterId).toBe("default");
    });

    it("preserves toasterId on merge", () => {
      const store = createToastStore();
      const originalToasterId = "custom-toaster";

      store.add(createTestItem({
        id: "dup",
        toasterId: originalToasterId,
      }));
      store.add(createTestItem({
        id: "dup",
        message: "updated",
        toasterId: "different",
      }));

      const item = store.getSnapshot()[0];
      expect(item.toasterId).toBe(originalToasterId);
    });
  });

  describe("update", () => {
    it("patches an existing item", () => {
      const store = createToastStore();
      store.add(createTestItem({ id: "u1", height: null }));

      store.update("u1", { height: 42 });

      expect(store.getSnapshot()[0].height).toBe(42);
    });

    it("does nothing for non-existent id", () => {
      const store = createToastStore();

      store.update("nope", { height: 42 });

      expect(store.getSnapshot()).toHaveLength(0);
    });
  });

  describe("dismiss", () => {
    it("transitions visible item to closing", () => {
      const store = createToastStore();
      store.add(createTestItem({ id: "d1" }));

      store.dismiss("d1");

      expect(store.getSnapshot()[0].status).toBe("closing");
    });

    it("ignores already-closing item", () => {
      const store = createToastStore();
      store.add(createTestItem({ id: "d1", status: "closing" }));

      store.dismiss("d1");

      expect(store.getSnapshot()[0].status).toBe("closing");
    });

    it("dismisses all when called without id", () => {
      const store = createToastStore();
      store.add(createTestItem({ id: "a" }));
      store.add(createTestItem({ id: "b" }));
      store.add(createTestItem({ id: "c", status: "closing" }));

      store.dismiss();

      const items = store.getSnapshot();
      expect(items.every((i) => i.status === "closing")).toBe(true);
    });
  });

  describe("remove", () => {
    it("removes item by id", () => {
      const store = createToastStore();
      store.add(createTestItem({ id: "r1" }));
      store.add(createTestItem({ id: "r2" }));

      store.remove("r1");

      expect(store.getSnapshot()).toHaveLength(1);
      expect(store.getSnapshot()[0].id).toBe("r2");
    });

    it("removes all when called without id", () => {
      const store = createToastStore();
      store.add(createTestItem({ id: "a" }));
      store.add(createTestItem({ id: "b" }));

      store.remove();

      expect(store.getSnapshot()).toHaveLength(0);
    });
  });

  describe("clear", () => {
    it("removes all items and resets pausedAt", () => {
      const store = createToastStore();
      store.add(createTestItem({ id: "a" }));
      store.startPause();

      store.clear();

      expect(store.getSnapshot()).toHaveLength(0);
    });
  });

  describe("updateHeight", () => {
    it("updates height via update", () => {
      const store = createToastStore();
      store.add(createTestItem({ id: "h1", height: null }));

      store.updateHeight("h1", 100);

      expect(store.getSnapshot()[0].height).toBe(100);
    });
  });

  describe("startPause / endPause", () => {
    it("sets pausedAt on startPause", () => {
      const store = createToastStore();
      store.add(createTestItem({ id: "p1" }));

      store.startPause();

      const item = store.getSnapshot()[0];
      expect(item.pausedAt).not.toBeNull();
    });

    it("accumulates pauseDuration on endPause", () => {
      const store = createToastStore();
      store.add(createTestItem({ id: "p1", duration: 4000 }));

      store.startPause();
      store.endPause();

      const item = store.getSnapshot()[0];
      expect(item.pausedAt).toBeNull();
      expect(item.pauseDuration).toBeGreaterThanOrEqual(0);
    });

    it("ignores startPause when already paused", () => {
      const store = createToastStore();
      store.add(createTestItem({ id: "p1" }));

      store.startPause();
      const firstPausedAt = store.getSnapshot()[0].pausedAt;

      store.startPause();

      expect(store.getSnapshot()[0].pausedAt).toBe(firstPausedAt);
    });

    it("ignores endPause when not paused", () => {
      const store = createToastStore();
      store.add(createTestItem({ id: "p1" }));

      store.endPause();

      expect(store.getSnapshot()[0].pausedAt).toBeNull();
    });
  });

  describe("subscribe", () => {
    it("notifies listeners on state change", () => {
      const store = createToastStore();
      const listener = vi.fn();

      store.subscribe(listener);
      store.add(createTestItem());

      expect(listener).toHaveBeenCalled();
    });

    it("returns unsubscribe function", () => {
      const store = createToastStore();
      const listener = vi.fn();

      const unsubscribe = store.subscribe(listener);
      unsubscribe();
      store.add(createTestItem());

      expect(listener).not.toHaveBeenCalled();
    });
  });
});