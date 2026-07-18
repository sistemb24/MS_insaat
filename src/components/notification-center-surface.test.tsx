/**
 * @vitest-environment jsdom
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { AppShell } from "./app-shell";
import { NotificationCenterSurface } from "./notification-center-surface";
import type { NotificationCenterRow } from "@/lib/notification-center-service";

const rows: NotificationCenterRow[] = [
  {
    id: "notification-due-cheque",
    categoryKey: "vade-bildirimleri",
    title: "Çek vadesi yaklaşıyor",
    body: "CEK-2026-001 için vade tarihi 3 gün içinde.",
    createdAt: "2026-07-02T08:30:00.000Z",
    priority: "Kritik",
    readAt: null,
    targetHref: "/cek?evrak=CEK-2026-001",
    targetLabel: "CEK-2026-001",
  },
  {
    id: "notification-stock-minimum",
    categoryKey: "stok-yonetimi",
    title: "Minimum stok seviyesi aşıldı",
    body: "C30 beton stoğu şantiye minimumunun altında.",
    createdAt: "2026-06-29T09:00:00.000Z",
    priority: "Yüksek",
    readAt: "2026-07-01T10:00:00.000Z",
    targetHref: "/stok-depo?evrak=STK-C30",
    targetLabel: "STK-C30",
  },
];

afterEach(() => {
  cleanup();
});

describe("NotificationCenterSurface", () => {
  test("renders stats, category toggles and links notifications to source records", () => {
    render(<NotificationCenterSurface rows={rows} today="2026-07-02" />);

    expect(screen.getByRole("heading", { name: "Bildirim Merkezi" })).toBeTruthy();
    expect(within(screen.getByLabelText("Toplam Bildirim")).getByText("2")).toBeTruthy();
    expect(within(screen.getByLabelText("Okunmamış")).getByText("1")).toBeTruthy();
    expect(within(screen.getByLabelText("Bugün")).getByText("1")).toBeTruthy();
    expect(within(screen.getByLabelText("Bu Hafta")).getByText("2")).toBeTruthy();
    expect(screen.getAllByRole("checkbox")).toHaveLength(13);
    expect(screen.getByText("Çek vadesi yaklaşıyor")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "CEK-2026-001 kaydına git" })
        .getAttribute("href"),
    ).toBe("/cek?evrak=CEK-2026-001");
  });

  test("hides notifications when their category is disabled", () => {
    render(<NotificationCenterSurface rows={rows} today="2026-07-02" />);

    fireEvent.click(screen.getByRole("checkbox", { name: /Stok Yönetimi/ }));

    expect(screen.queryByText("Minimum stok seviyesi aşıldı")).toBeNull();
    expect(within(screen.getByLabelText("Toplam Bildirim")).getByText("1")).toBeTruthy();
    expect(within(screen.getByLabelText("Okunmamış")).getByText("1")).toBeTruthy();
  });

  test("sends category preference changes to persistence", async () => {
    const setPreference = vi.fn().mockResolvedValue({ ok: true });

    render(
      <NotificationCenterSurface
        persistence={{ setPreference }}
        rows={rows}
        today="2026-07-02"
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /Stok Yönetimi/ }));

    await waitFor(() => {
      expect(setPreference).toHaveBeenCalledWith({
        categoryKey: "stok-yonetimi",
        inAppEnabled: false,
      });
    });
  });

  test("marks unread notifications as read through persistence", async () => {
    const markAsRead = vi.fn().mockResolvedValue({ ok: true });

    render(
      <NotificationCenterSurface
        persistence={{ markAsRead }}
        rows={rows}
        today="2026-07-02"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "CEK-2026-001 bildirimini okundu işaretle",
      }),
    );

    await waitFor(() => {
      expect(markAsRead).toHaveBeenCalledWith("notification-due-cheque");
    });
    await waitFor(() => {
      expect(screen.queryByText("okunmamış")).toBeNull();
      expect(within(screen.getByLabelText("Okunmamış")).getByText("0")).toBeTruthy();
    });
  });
});

describe("AppShell notification badge", () => {
  test("shows unread notification count in the top bar", () => {
    render(
      <AppShell notificationUnreadCount={4}>
        <div>İçerik</div>
      </AppShell>,
    );

    expect(
      screen
        .getByRole("link", { name: "4 okunmamış bildirim" })
        .getAttribute("href"),
    ).toBe("/bildirimler");
  });
});
