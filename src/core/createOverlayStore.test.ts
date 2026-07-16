import { describe, it, expect } from "vitest";
import { createOverlayStore } from "./createOverlayStore";

describe("createOverlayStore", () => {
  describe("open", () => {
    it("adds item to snapshot after open", () => {
      const store = createOverlayStore();

      store.open({ type: "modal" });

      const items = store.getSnapshot();
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe("modal");
      expect(items[0].status).toBe("open");
    });

    it("returns id and promise from open", () => {
      const store = createOverlayStore();

      const { id, promise } = store.open({ type: "modal" });

      expect(id).toBeDefined();
      expect(promise).toBeInstanceOf(Promise);
    });

    it("uses provided id when given", () => {
      const store = createOverlayStore();

      store.open({ id: "custom-id", type: "modal" });

      const items = store.getSnapshot();
      expect(items[0].id).toBe("custom-id");
    });
  });

  describe("close", () => {
    it("transitions status to closing and sets closeResult", () => {
      const store = createOverlayStore();
      const { id } = store.open({ type: "modal" });

      store.close(id, "done");

      const item = store.getSnapshot().find((i) => i.id === id);
      expect(item?.status).toBe("closing");
      expect(item?.closeResult).toBe("done");
    });

    it("ignores close on already-closing item", () => {
      const store = createOverlayStore();
      const { id } = store.open({ type: "modal" });

      store.close(id, "first");
      store.close(id, "second");

      const item = store.getSnapshot().find((i) => i.id === id);
      expect(item?.closeResult).toBe("first");
    });
  });

  describe("reject", () => {
    it("rejects Promise with reason when reject then remove", async () => {
      const store = createOverlayStore();
      const { id, promise } = store.open<string>({ type: "modal" });

      store.reject(id, new Error("timeout"));
      store.remove(id);

      await expect(promise).rejects.toThrow("timeout");
    });

    it("resolves Promise with result when close then remove (regression)", async () => {
      const store = createOverlayStore();
      const { id, promise } = store.open<string>({ type: "modal" });

      store.close(id, "success");
      store.remove(id);

      await expect(promise).resolves.toBe("success");
    });

    it("resolves with undefined when remove is called without close (existing behavior)", async () => {
      const store = createOverlayStore();
      const { id, promise } = store.open<string>({ type: "modal" });

      store.remove(id);

      await expect(promise).resolves.toBeUndefined();
    });

    it("rejects with undefined reason when reject(id, undefined) is called", async () => {
      const store = createOverlayStore();
      const { id, promise } = store.open<string>({ type: "modal" });

      store.reject(id, undefined);
      store.remove(id);

      await expect(promise).rejects.toBeUndefined();
    });

    it("transitions status to closing and sets rejected flag", () => {
      const store = createOverlayStore();
      const { id } = store.open({ type: "modal" });

      store.reject(id, "reason");

      const item = store.getSnapshot().find((i) => i.id === id);
      expect(item?.status).toBe("closing");
      expect(item?.rejected).toBe(true);
      expect(item?.rejectReason).toBe("reason");
    });

    it("ignores reject on already-closing item", () => {
      const store = createOverlayStore();
      const { id } = store.open({ type: "modal" });

      store.close(id, "first");
      store.reject(id, "reason");

      const item = store.getSnapshot().find((i) => i.id === id);
      expect(item?.closeResult).toBe("first");
      expect(item?.rejected).toBeUndefined();
    });

    it("ignores reject on non-existent id", () => {
      const store = createOverlayStore();

      expect(() => store.reject("non-existent", "reason")).not.toThrow();
    });
  });

  describe("remove", () => {
    it("removes item from snapshot", () => {
      const store = createOverlayStore();
      const { id } = store.open({ type: "modal" });

      store.remove(id);

      expect(store.getSnapshot()).toHaveLength(0);
    });

    it("removes last item when called without id", () => {
      const store = createOverlayStore();
      store.open({ id: "first", type: "modal" });
      store.open({ id: "second", type: "modal" });

      store.remove();

      const items = store.getSnapshot();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("first");
    });

    it("ignores remove when no items exist", () => {
      const store = createOverlayStore();

      expect(() => store.remove()).not.toThrow();
    });
  });

  describe("clear", () => {
    it("removes all items from snapshot", () => {
      const store = createOverlayStore();
      store.open({ type: "modal" });
      store.open({ type: "modal" });

      store.clear();

      expect(store.getSnapshot()).toHaveLength(0);
    });

    it("settles all pending promises on clear", async () => {
      const store = createOverlayStore();
      const { promise: p1 } = store.open<string>({ type: "modal" });
      const { promise: p2 } = store.open<string>({ type: "modal" });

      store.clear();

      await expect(p1).resolves.toBeUndefined();
      await expect(p2).resolves.toBeUndefined();
    });

    it("rejects pending rejected items on clear", async () => {
      const store = createOverlayStore();
      const { id, promise: rejectedPromise } = store.open<string>({ type: "modal" });
      const { promise: normalPromise } = store.open<string>({ type: "modal" });

      store.reject(id, "cleared-error");
      store.clear();

      await expect(rejectedPromise).rejects.toBe("cleared-error");
      await expect(normalPromise).resolves.toBeUndefined();
    });
  });

  describe("subscribe", () => {
    it("calls listener when state changes", () => {
      const store = createOverlayStore();
      let callCount = 0;

      store.subscribe(() => {
        callCount++;
      });

      store.open({ type: "modal" });
      store.close(store.getSnapshot()[0].id);

      expect(callCount).toBeGreaterThanOrEqual(2);
    });

    it("returns unsubscribe function", () => {
      const store = createOverlayStore();
      let callCount = 0;

      const unsubscribe = store.subscribe(() => {
        callCount++;
      });

      unsubscribe();
      store.open({ type: "modal" });

      expect(callCount).toBe(0);
    });
  });

  describe("getInitialSnapshot", () => {
    it("returns empty array initially", () => {
      const store = createOverlayStore();

      expect(store.getInitialSnapshot()).toEqual([]);
    });
  });
});
