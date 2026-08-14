import { describe, it, expect, vi, afterEach } from "vitest";
import { createToastRuntime } from "../src/core/createToastRuntime";
import type { ToastRuntimeApi } from "../src/types/toast";

function createRuntime(): ToastRuntimeApi {
  return createToastRuntime("test-toaster");
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createToastRuntime", () => {
  describe("addToast", () => {
    it("adds a new toast and returns its id", () => {
      const runtime = createRuntime();

      const id = runtime.addToast("blank", "Hello");

      expect(id).toBeDefined();
      expect(runtime.getRawSnapshot()).toHaveLength(1);
      expect(runtime.getRawSnapshot()[0].message).toBe("Hello");
    });

    it("uses provided id when given", () => {
      const runtime = createRuntime();

      runtime.addToast("blank", "Hello", { id: "custom-id" });

      expect(runtime.getRawSnapshot()[0].id).toBe("custom-id");
    });

    it("initializes lifespan on same id (createdAt updated)", () => {
      const runtime = createRuntime();
      vi.useFakeTimers();

      runtime.addToast("blank", "first", { id: "dup", duration: 4000 });
      const firstCreatedAt = runtime.getRawSnapshot()[0].createdAt;

      vi.advanceTimersByTime(1000);

      runtime.addToast("blank", "second", { id: "dup", duration: 4000 });
      const secondCreatedAt = runtime.getRawSnapshot()[0].createdAt;

      expect(secondCreatedAt).toBeGreaterThan(firstCreatedAt);
    });

    it("resets status to visible when updating a closing toast", () => {
      const runtime = createRuntime();
      vi.useFakeTimers();

      runtime.addToast("blank", "first", { id: "dup", duration: 100 });
      vi.advanceTimersByTime(200);
      // toast should have been dismissed (status: closing)

      runtime.addToast("blank", "second", { id: "dup", duration: 4000 });

      const item = runtime.getRawSnapshot()[0];
      expect(item.status).toBe("visible");
      expect(item.message).toBe("second");
    });

    it("does not create duplicate items for same id", () => {
      const runtime = createRuntime();

      runtime.addToast("blank", "first", { id: "dup" });
      runtime.addToast("blank", "second", { id: "dup" });

      expect(runtime.getRawSnapshot()).toHaveLength(1);
    });
  });

  describe("dismiss", () => {
    it("transitions toast to closing status", () => {
      const runtime = createRuntime();

      const id = runtime.addToast("blank", "Hello");
      runtime.dismiss(id);

      expect(runtime.getRawSnapshot()[0].status).toBe("closing");
    });

    it("dismisses all when called without id", () => {
      const runtime = createRuntime();

      runtime.addToast("blank", "A");
      runtime.addToast("blank", "B");
      runtime.dismiss();

      expect(runtime.getRawSnapshot().every((t) => t.status === "closing")).toBe(true);
    });

    it("ignores already-closing toast", () => {
      const runtime = createRuntime();

      const id = runtime.addToast("blank", "Hello");
      runtime.dismiss(id);
      runtime.dismiss(id);

      expect(runtime.getRawSnapshot()[0].status).toBe("closing");
    });
  });

  describe("remove", () => {
    it("removes toast by id", () => {
      const runtime = createRuntime();

      const id = runtime.addToast("blank", "Hello");
      runtime.remove(id);

      expect(runtime.getRawSnapshot()).toHaveLength(0);
    });

    it("removes all when called without id", () => {
      const runtime = createRuntime();

      runtime.addToast("blank", "A");
      runtime.addToast("blank", "B");
      runtime.remove();

      expect(runtime.getRawSnapshot()).toHaveLength(0);
    });
  });

  describe("clear", () => {
    it("removes all toasts", () => {
      const runtime = createRuntime();

      runtime.addToast("blank", "A");
      runtime.addToast("blank", "B");
      runtime.clear();

      expect(runtime.getRawSnapshot()).toHaveLength(0);
    });
  });

  describe("closeAll", () => {
    it("transitions all visible toasts to closing", () => {
      const runtime = createRuntime();

      runtime.addToast("blank", "A");
      runtime.addToast("blank", "B");
      runtime.closeAll();

      const items = runtime.getRawSnapshot();
      expect(items.every((t) => t.status === "closing")).toBe(true);
    });

    it("does not remove items from store (unlike clear)", () => {
      const runtime = createRuntime();

      runtime.addToast("blank", "A");
      runtime.addToast("blank", "B");
      runtime.closeAll();

      expect(runtime.getRawSnapshot()).toHaveLength(2);
    });

    it("ignores already-closing toasts", () => {
      const runtime = createRuntime();
      vi.useFakeTimers();

      const id = runtime.addToast("blank", "A", { duration: 100 });
      vi.advanceTimersByTime(200);
      runtime.addToast("blank", "B");
      runtime.closeAll();

      const items = runtime.getRawSnapshot();
      expect(items).toHaveLength(2);
      expect(items.every((t) => t.status === "closing")).toBe(true);
    });

    it("does nothing when no toasts exist", () => {
      const runtime = createRuntime();

      expect(() => runtime.closeAll()).not.toThrow();
      expect(runtime.getRawSnapshot()).toHaveLength(0);
    });
  });

  describe("updateHeight", () => {
    it("updates height for a toast", () => {
      const runtime = createRuntime();

      const id = runtime.addToast("blank", "Hello");
      runtime.updateHeight(id, 120);

      expect(runtime.getRawSnapshot()[0].height).toBe(120);
    });
  });

  describe("configureView", () => {
    it("filters toasts by position in getSnapshot", () => {
      const runtime = createRuntime();

      runtime.configureView({
        limit: 10,
        position: "top-right",
      });

      runtime.addToast("blank", "A", { position: "top-right" });
      runtime.addToast("blank", "B", { position: "bottom-left" });

      const visible = runtime.getSnapshot();
      expect(visible).toHaveLength(1);
      expect(visible[0].message).toBe("A");
    });

    it("limits visible toasts to configured limit", () => {
      const runtime = createRuntime();

      runtime.configureView({
        limit: 2,
        position: "top-right",
      });

      runtime.addToast("blank", "A", { position: "top-right" });
      runtime.addToast("blank", "B", { position: "top-right" });
      runtime.addToast("blank", "C", { position: "top-right" });

      expect(runtime.getSnapshot()).toHaveLength(2);
    });
  });

  describe("promiseToast", () => {
    it("shows loading then success on resolve", async () => {
      const runtime = createRuntime();

      const data = await runtime.promiseToast(
        Promise.resolve("result"),
        {
          loading: "Loading...",
          success: (data) => `Success: ${data}`,
          error: "Error",
        },
      );

      expect(data).toBe("result");
      const item = runtime.getRawSnapshot()[0];
      expect(item.type).toBe("success");
      expect(item.message).toBe("Success: result");
    });

    it("shows loading then error on reject", async () => {
      const runtime = createRuntime();

      await expect(
        runtime.promiseToast(
          Promise.reject(new Error("failed")),
          {
            loading: "Loading...",
            success: "Success",
            error: (err) => `Error: ${(err as Error).message}`,
          },
        ),
      ).rejects.toThrow("failed");

      const item = runtime.getRawSnapshot()[0];
      expect(item.type).toBe("error");
      expect(item.message).toBe("Error: failed");
    });
  });

  describe("subscribe", () => {
    it("notifies on toast addition", () => {
      const runtime = createRuntime();
      const listener = vi.fn();

      runtime.subscribe(listener);
      runtime.addToast("blank", "Hello");

      expect(listener).toHaveBeenCalled();
    });

    it("returns unsubscribe function", () => {
      const runtime = createRuntime();
      const listener = vi.fn();

      const unsubscribe = runtime.subscribe(listener);
      unsubscribe();
      runtime.addToast("blank", "Hello");

      expect(listener).not.toHaveBeenCalled();
    });
  });
});