/**
 * @vitest-environment jsdom
 */

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const routerPushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

import type { GlobalSearchAction } from "@/app/actions/global-search-actions";
import {
  GlobalSearchProvider,
  GlobalSearchTrigger,
} from "./global-search-command";

const result = (
  overrides: Partial<{
    code: string;
    group: string;
    href: string;
    id: string;
    score: number;
    title: string;
    type: "entity" | "tender";
  }> = {},
) => ({
  id: "entity-atlas",
  type: "entity" as const,
  group: "Şantiyeler",
  code: "SANT-001",
  title: "Atlas Şantiyesi",
  subtitle: "Ayşe Demir",
  status: "Aktif",
  href: "/santiyeler",
  score: 55,
  ...overrides,
});

function renderSearch(searchAction: GlobalSearchAction) {
  render(
    <GlobalSearchProvider searchAction={searchAction}>
      <GlobalSearchTrigger variant="desktop" />
      <GlobalSearchTrigger variant="mobile" />
      <div>Uygulama içeriği</div>
    </GlobalSearchProvider>,
  );
}

async function advanceDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });
}

describe("global search command", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    routerPushMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("opens with Ctrl/Cmd+K, focuses input, and restores trigger focus on Escape", async () => {
    renderSearch(vi.fn());
    const desktopTrigger = screen.getAllByRole("button", {
      name: "Global aramayı aç",
    })[0];

    fireEvent.keyDown(document, { ctrlKey: true, key: "k" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16);
    });

    expect(screen.getByRole("dialog", { name: "Global Arama" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Modül veya kayıt ara" })).toBe(
      document.activeElement,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Global Arama" })).toBeNull();
    expect(desktopTrigger).toBe(document.activeElement);
  });

  it("waits for two characters and debounces the server action by 250 ms", async () => {
    const searchAction = vi.fn<GlobalSearchAction>().mockResolvedValue({
      data: { query: "at", results: [result()], truncated: false },
      ok: true,
    });
    renderSearch(searchAction);
    fireEvent.click(screen.getAllByRole("button", { name: "Global aramayı aç" })[0]);
    const input = screen.getByRole("combobox", { name: "Modül veya kayıt ara" });

    fireEvent.change(input, { target: { value: "a" } });
    expect(screen.getAllByText("Arama için en az 2 karakter yazın.")).toHaveLength(2);
    expect(searchAction).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "at" } });
    expect(screen.getAllByText("Aranıyor…")).toHaveLength(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(249);
    });
    expect(searchAction).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(searchAction).toHaveBeenCalledWith("at");
    expect(screen.getByRole("option", { name: /Atlas Şantiyesi/ })).toBeTruthy();
    expect(screen.getByText("1 sonuç")).toBeTruthy();
  });

  it("prevents an older response from replacing the latest query", async () => {
    const first = deferred<Awaited<ReturnType<GlobalSearchAction>>>();
    const second = deferred<Awaited<ReturnType<GlobalSearchAction>>>();
    const searchAction = vi
      .fn<GlobalSearchAction>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    renderSearch(searchAction);
    fireEvent.click(screen.getAllByRole("button", { name: "Global aramayı aç" })[0]);
    const input = screen.getByRole("combobox", { name: "Modül veya kayıt ara" });

    fireEvent.change(input, { target: { value: "at" } });
    await advanceDebounce();
    fireEvent.change(input, { target: { value: "atlas" } });
    await advanceDebounce();

    await act(async () => {
      second.resolve({
        data: {
          query: "atlas",
          results: [result({ id: "latest", title: "Atlas Güncel" })],
          truncated: false,
        },
        ok: true,
      });
      await Promise.resolve();
    });
    expect(screen.getByText("Atlas Güncel")).toBeTruthy();

    await act(async () => {
      first.resolve({
        data: {
          query: "at",
          results: [result({ id: "old", title: "Atlas Eski" })],
          truncated: false,
        },
        ok: true,
      });
      await Promise.resolve();
    });
    expect(screen.getByText("Atlas Güncel")).toBeTruthy();
    expect(screen.queryByText("Atlas Eski")).toBeNull();
  });

  it("supports arrow selection and Enter navigation with a safe internal href", async () => {
    const searchAction = vi.fn<GlobalSearchAction>().mockResolvedValue({
      data: {
        query: "atlas",
        results: [
          result(),
          result({
            id: "tender-atlas",
            type: "tender",
            group: "İhaleler",
            code: "IHL-001",
            title: "Atlas İhalesi",
            href: "/ihale-yonetimi",
          }),
        ],
        truncated: false,
      },
      ok: true,
    });
    renderSearch(searchAction);
    fireEvent.click(screen.getAllByRole("button", { name: "Global aramayı aç" })[0]);
    const input = screen.getByRole("combobox", { name: "Modül veya kayıt ara" });
    fireEvent.change(input, { target: { value: "atlas" } });
    await advanceDebounce();
    expect(screen.getByText("Atlas İhalesi")).toBeTruthy();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(
      screen.getByRole("option", { name: /Atlas İhalesi/ }).getAttribute("aria-selected"),
    ).toBe("true");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(routerPushMock).toHaveBeenCalledWith("/ihale-yonetimi");
    expect(screen.queryByRole("dialog", { name: "Global Arama" })).toBeNull();
  });

  it("traps Tab focus inside the dialog and exposes safe error state", async () => {
    const searchAction = vi.fn<GlobalSearchAction>().mockResolvedValue({
      code: "search-failed",
      message: "Arama şu anda tamamlanamadı. Lütfen yeniden deneyin.",
      ok: false,
    });
    renderSearch(searchAction);
    fireEvent.click(screen.getAllByRole("button", { name: "Global aramayı aç" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Global Arama" });
    const closeButton = within(dialog).getByRole("button", { name: "Aramayı kapat" });
    closeButton.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(
      within(dialog).getByRole("combobox", { name: "Modül veya kayıt ara" }),
    );

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "atlas" } });
    await advanceDebounce();
    expect(
      screen.getAllByText("Arama şu anda tamamlanamadı. Lütfen yeniden deneyin."),
    ).toHaveLength(2);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}
