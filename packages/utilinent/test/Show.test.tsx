import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Show } from "../src/index";

describe("Show public export", () => {
  it("renders children when the condition matches", () => {
    render(<Show when={true}>Visible content</Show>);

    expect(screen.getByText("Visible content")).toBeInTheDocument();
  });

  it("removes rendered children when unmounted", () => {
    const rendered = render(<Show when={true}>Unmounted content</Show>);

    rendered.unmount();

    expect(screen.queryByText("Unmounted content")).not.toBeInTheDocument();
  });
});
