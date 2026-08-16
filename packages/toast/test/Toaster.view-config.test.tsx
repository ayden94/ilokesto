import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Toaster } from "../src/components/Toaster";
import { getRuntime } from "../src/core/registry";
import { toast } from "../src/core/toast";
import type { DefaultToastOptions } from "../src/types/toast";

const TOASTER_ID = "view-config-toaster";
const CONFIGURED_TOAST_OPTIONS = {
  duration: 60_000,
  className: "configured-row",
  ariaProps: {
    role: "alert",
    "aria-live": "assertive",
    "aria-atomic": false,
  },
} satisfies DefaultToastOptions;

afterEach(() => {
  cleanup();
  expect(getRuntime(TOASTER_ID)).toBeUndefined();
});

describe("Toaster view configuration", () => {
  it("clears removed defaults after rerender while preserving the existing accessible toast row", async () => {
    // Given
    const view = render(
      <Toaster
        toasterId={TOASTER_ID}
        toastOptions={CONFIGURED_TOAST_OPTIONS}
      />,
    );

    await waitFor(() => {
      expect(getRuntime(TOASTER_ID)).toBeDefined();
    });

    const region = screen.getByRole("region", { name: "Notifications" });

    act(() => {
      toast("Configured toast", { toasterId: TOASTER_ID });
    });

    const configuredRow = await within(region).findByRole("alert");
    expect(configuredRow).toHaveTextContent("Configured toast");
    expect(configuredRow).toHaveClass("configured-row");
    expect(configuredRow).toHaveAttribute("aria-live", "assertive");
    expect(configuredRow).toHaveAttribute("aria-atomic", "false");

    // When
    view.rerender(<Toaster toasterId={TOASTER_ID} />);

    act(() => {
      toast("Unconfigured toast", { toasterId: TOASTER_ID });
    });

    // Then
    const unconfiguredRow = await within(region).findByRole("status");
    expect(unconfiguredRow).toHaveTextContent("Unconfigured toast");
    expect(unconfiguredRow).not.toHaveClass("configured-row");
    expect(unconfiguredRow).toHaveAttribute("aria-live", "polite");
    expect(unconfiguredRow).toHaveAttribute("aria-atomic", "true");
    expect(within(region).getByRole("alert")).toBe(configuredRow);
    expect(configuredRow).toHaveTextContent("Configured toast");
  });
});
