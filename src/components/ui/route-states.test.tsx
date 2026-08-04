// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PlatformListControls } from "../super-admin/platform-list-controls";
import { RouteErrorState } from "./route-error-state";
import { RouteLoadingState } from "./route-loading-state";

describe("route states", () => {
  it("renders an accessible loading state with busy semantics", () => {
    const html = renderToStaticMarkup(<RouteLoadingState />);

    expect(html).toContain('data-route-state="loading"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
  });

  it("uses the Next.js retry callback without exposing error details", () => {
    const retry = vi.fn();
    render(
      <RouteErrorState
        error={new Error("database secret detail")}
        unstable_retry={retry}
      />,
    );

    expect(screen.queryByText("database secret detail")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tekrar Dene" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("shares labeled form controls and disabled pagination semantics", () => {
    render(
      <PlatformListControls
        page={1}
        path="/super-admin/users"
        query=""
        sort="created-desc"
        sortOptions={[{ label: "En yeni", value: "created-desc" }]}
        totalPages={1}
      />,
    );

    expect(screen.getByLabelText("Filtre")).toBeTruthy();
    expect(screen.getByLabelText("Sıralama")).toBeTruthy();
    expect(screen.getAllByText(/Önceki|Sonraki/)).toHaveLength(2);
    expect(screen.getAllByText(/Önceki|Sonraki/).every((node) => node.getAttribute("aria-disabled") === "true")).toBe(true);
  });
});
