"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui";

type AppShellMobileDrawerProps = {
  children: ReactNode;
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function AppShellMobileDrawer({ children }: AppShellMobileDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const drawerId = useId();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const triggerElement = triggerRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      triggerElement?.focus();
    };
  }, [isOpen]);

  function closeFromNavigation(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("a[href]")) {
      setIsOpen(false);
    }
  }

  return (
    <>
      <button
        aria-controls={drawerId}
        aria-expanded={isOpen}
        aria-label="Menüyü aç"
        className="inline-flex h-10 w-10 items-center justify-center rounded-ui-control border border-divider bg-surface-raised text-content-subtle transition-colors hover:bg-surface-muted hover:text-brand-primary lg:hidden"
        onClick={() => setIsOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true" className="flex flex-col gap-1.5">
          <span className="h-0.5 w-5 rounded-full bg-current" />
          <span className="h-0.5 w-5 rounded-full bg-current" />
          <span className="h-0.5 w-5 rounded-full bg-current" />
        </span>
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-hidden="true"
            className="absolute inset-0 bg-scrim backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
            tabIndex={-1}
            type="button"
          />
          <div
            aria-labelledby={titleId}
            aria-modal="true"
            className="relative flex h-dvh max-h-dvh w-[min(88vw,360px)] flex-col bg-surface-raised text-content shadow-2xl"
            data-mobile-drawer="true"
            id={drawerId}
            ref={dialogRef}
            role="dialog"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-divider px-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-ui-control bg-brand-primary-strong text-on-brand">
                  <Icon name="building" size={20} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-brand-primary" id={titleId}>
                    NOA İnşaat
                  </h2>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-content-muted">
                    İnşaat Yönetim SaaS
                  </p>
                </div>
              </div>
              <button
                aria-label="Menüyü kapat"
                className="inline-flex h-10 w-10 items-center justify-center rounded-ui-control text-content-subtle hover:bg-surface-muted hover:text-content"
                onClick={() => setIsOpen(false)}
                ref={closeButtonRef}
                type="button"
              >
                <Icon name="close" />
              </button>
            </div>
            <div
              className="flex min-h-0 flex-1 flex-col bg-surface-raised"
              data-mobile-drawer-content="true"
              onClick={closeFromNavigation}
            >
              {children}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
