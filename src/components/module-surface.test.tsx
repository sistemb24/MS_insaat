/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import type { ModuleContent } from "@/lib/module-content";

import { ModuleSurface } from "./module-surface";

afterEach(() => {
  cleanup();
});

describe("ModuleSurface", () => {
  test("shows a visible placeholder notice for toolbar actions", () => {
    render(<ModuleSurface content={createModuleContent()} />);

    fireEvent.click(screen.getByRole("button", { name: "Yeni Şantiye" }));
    expect(screen.getByRole("status").textContent).toBe(
      "Yeni Şantiye aksiyonu planlı placeholder kapsamındadır; gerçek domain işlemi ilgili modül diliminde bağlanacaktır.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Yazdır" }));
    expect(screen.getByRole("status").textContent).toBe(
      "Yazdır aksiyonu planlı placeholder kapsamındadır; gerçek domain işlemi ilgili modül diliminde bağlanacaktır.",
    );
  });
});

function createModuleContent(): ModuleContent {
  return {
    eyebrow: "P0 çekirdek modül",
    metrics: [
      {
        detail: "Liste ve maliyet analizi",
        label: "Planlanan şablon",
        status: "process",
        value: "2",
      },
    ],
    primaryActions: ["Yeni Şantiye", "Gelir/Gider"],
    summary: "Şantiye kartları için placeholder iş akışı.",
    templateSources: ["Şantiye_proje_listesi_1.html"],
    title: "Şantiye & Proje Yönetimi",
  };
}
