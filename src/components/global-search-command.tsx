"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

import type { GlobalSearchAction } from "@/app/actions/global-search-actions";
import { useCloseAppShellMobileDrawer } from "@/components/app-shell-mobile-drawer";
import { Icon } from "@/components/ui";
import {
  GLOBAL_SEARCH_MAX_QUERY_LENGTH,
  prepareGlobalSearchQuery,
  type GlobalSearchResult,
} from "@/lib/global-search-domain";

type GlobalSearchContextValue = {
  openSearch: (trigger: HTMLButtonElement | null) => void;
};

type GlobalSearchProviderProps = {
  children: ReactNode;
  searchAction: GlobalSearchAction;
};

type GlobalSearchTriggerProps = {
  variant: "desktop" | "mobile";
};

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);
const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function GlobalSearchProvider({
  children,
  searchAction,
}: GlobalSearchProviderProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const requestSequenceRef = useRef(0);
  const titleId = useId();
  const descriptionId = useId();
  const resultListId = useId();

  const openSearch = useCallback((trigger: HTMLButtonElement | null) => {
    returnFocusRef.current = trigger;
    requestSequenceRef.current += 1;
    setQuery("");
    setResults([]);
    setErrorMessage("");
    setIsLoading(false);
    setSelectedIndex(0);
    setIsOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    requestSequenceRef.current += 1;
    setQuery("");
    setResults([]);
    setErrorMessage("");
    setIsLoading(false);
    setSelectedIndex(0);
    setIsOpen(false);
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        const trigger = document.querySelector<HTMLButtonElement>(
          '[data-global-search-trigger="desktop"]',
        );
        openSearch(trigger);
      }
    }

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [openSearch]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const returnFocusTarget = returnFocusRef.current;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => inputRef.current?.focus());

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSearch();
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
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleDialogKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDialogKeyDown);
      returnFocusTarget?.focus();
    };
  }, [closeSearch, isOpen]);

  useEffect(() => {
    requestSequenceRef.current += 1;
    const requestId = requestSequenceRef.current;

    if (!isOpen) {
      return;
    }

    const validation = prepareGlobalSearchQuery(query);

    if (!validation.valid) {
      return;
    }

    const timer = window.setTimeout(() => {
      void searchAction(validation.query)
        .then((result) => {
          if (requestSequenceRef.current !== requestId) {
            return;
          }

          if (!result.ok) {
            setResults([]);
            setErrorMessage(result.message);
            return;
          }

          setResults(result.data.results);
          setSelectedIndex(0);
        })
        .catch(() => {
          if (requestSequenceRef.current === requestId) {
            setResults([]);
            setErrorMessage("Arama şu anda tamamlanamadı. Lütfen yeniden deneyin.");
          }
        })
        .finally(() => {
          if (requestSequenceRef.current === requestId) {
            setIsLoading(false);
          }
        });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [isOpen, query, searchAction]);

  const groupedResults = useMemo(() => groupResults(results), [results]);
  const statusMessage = getStatusMessage({
    errorMessage,
    isLoading,
    query,
    resultCount: results.length,
  });

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) =>
        current === 0 ? results.length - 1 : current - 1,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selectedResult = results[selectedIndex];

      if (selectedResult && isSafeInternalHref(selectedResult.href)) {
        closeSearch();
        router.push(selectedResult.href);
      }
    }
  }

  function handleQueryChange(nextQuery: string) {
    requestSequenceRef.current += 1;
    setQuery(nextQuery);
    setResults([]);
    setErrorMessage("");
    setSelectedIndex(0);
    setIsLoading(prepareGlobalSearchQuery(nextQuery).valid);
  }

  return (
    <GlobalSearchContext value={{ openSearch }}>
      {children}
      {isOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-scrim px-3 py-[8vh] backdrop-blur-[1px] sm:px-6"
          data-print-hidden="true"
        >
          <button
            aria-hidden="true"
            className="absolute inset-0"
            onClick={closeSearch}
            tabIndex={-1}
            type="button"
          />
          <div
            aria-describedby={descriptionId}
            aria-labelledby={titleId}
            aria-modal="true"
            className="relative flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-ui-panel border border-divider bg-surface-raised text-content shadow-2xl"
            ref={dialogRef}
            role="dialog"
          >
            <div className="flex items-center gap-3 border-b border-divider px-4 py-3">
              <Icon className="shrink-0 text-content-muted" name="search" />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold" id={titleId}>
                  Global Arama
                </h2>
                <p className="sr-only" id={descriptionId}>
                  Yetkili modül ve kayıtları aktif firma ve dönem içinde arayın.
                </p>
              </div>
              <button
                aria-label="Aramayı kapat"
                className="inline-flex h-10 w-10 items-center justify-center rounded-ui-control text-content-subtle hover:bg-surface-muted hover:text-content"
                onClick={closeSearch}
                type="button"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="border-b border-divider p-4">
              <label className="sr-only" htmlFor={`${resultListId}-input`}>
                Modül veya kayıt ara
              </label>
              <input
                aria-activedescendant={
                  results[selectedIndex]
                    ? `${resultListId}-option-${selectedIndex}`
                    : undefined
                }
                aria-controls={resultListId}
                aria-expanded={results.length > 0}
                aria-label="Modül veya kayıt ara"
                autoComplete="off"
                className="h-11 w-full rounded-ui-control border border-divider bg-surface px-3 text-sm text-content outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-subtle"
                id={`${resultListId}-input`}
                maxLength={GLOBAL_SEARCH_MAX_QUERY_LENGTH}
                onChange={(event) => handleQueryChange(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Kod, belge no, cari, şantiye veya modül ara"
                ref={inputRef}
                role="combobox"
                spellCheck={false}
                type="search"
                value={query}
              />
            </div>

            <div className="min-h-40 flex-1 overflow-y-auto p-2" id={resultListId} role="listbox">
              {results.length > 0 && !isLoading && !errorMessage ? (
                groupedResults.map((group) => (
                  <section aria-labelledby={`${resultListId}-${group.slug}`} key={group.name}>
                    <h3
                      className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-content-muted first:pt-1"
                      id={`${resultListId}-${group.slug}`}
                    >
                      {group.name}
                    </h3>
                    <div className="space-y-1">
                      {group.results.map(({ index, result }) => (
                        <Link
                          aria-selected={selectedIndex === index}
                          className="flex min-h-14 items-center gap-3 rounded-ui-control px-3 py-2 text-left transition-colors hover:bg-surface-muted data-[selected=true]:bg-brand-primary-subtle"
                          data-selected={selectedIndex === index}
                          href={result.href}
                          id={`${resultListId}-option-${index}`}
                          key={`${result.type}:${result.id}`}
                          onClick={closeSearch}
                          onMouseEnter={() => setSelectedIndex(index)}
                          role="option"
                        >
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-control bg-surface-muted text-brand-primary">
                            <Icon name="search" size={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-content">
                                {result.title}
                              </span>
                              {result.status ? (
                                <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-content-subtle">
                                  {result.status}
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-content-muted">
                              {result.code}
                              {result.subtitle ? ` · ${result.subtitle}` : ""}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className="flex min-h-36 items-center justify-center px-6 text-center text-sm text-content-muted">
                  {statusMessage}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-divider bg-surface-muted px-4 py-2 text-[11px] text-content-muted">
              <span>↑↓ seç · Enter aç · Esc kapat</span>
              <span>{results.length > 0 ? `${results.length} sonuç` : "Aktif kapsam"}</span>
            </div>
            <p aria-live="polite" className="sr-only" role="status">
              {statusMessage}
            </p>
          </div>
        </div>
      ) : null}
    </GlobalSearchContext>
  );
}

export function GlobalSearchTrigger({ variant }: GlobalSearchTriggerProps) {
  const context = useContext(GlobalSearchContext);
  const closeMobileDrawer = useCloseAppShellMobileDrawer();
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (!context) {
    return null;
  }

  const isMobile = variant === "mobile";

  return (
    <button
      aria-label="Global aramayı aç"
      className={
        isMobile
          ? "flex h-10 w-full items-center justify-between rounded-ui-control border border-divider bg-surface-muted px-3 text-sm font-semibold text-content"
          : "hidden h-10 min-w-44 items-center gap-2 rounded-ui-control border border-divider bg-surface-muted px-3 text-xs font-semibold text-content-subtle transition-colors hover:border-brand-primary hover:text-brand-primary lg:inline-flex"
      }
      data-global-search-trigger={variant}
      onClick={() => {
        if (isMobile) {
          closeMobileDrawer?.();
        }

        context.openSearch(triggerRef.current);
      }}
      ref={triggerRef}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon name="search" size={17} />
        <span className="truncate">Global Arama</span>
      </span>
      <kbd className="rounded border border-divider bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-content-muted">
        Ctrl K
      </kbd>
    </button>
  );
}

function groupResults(results: GlobalSearchResult[]) {
  const groups = new Map<
    string,
    { name: string; results: Array<{ index: number; result: GlobalSearchResult }>; slug: string }
  >();

  results.forEach((result, index) => {
    const existing = groups.get(result.group);

    if (existing) {
      existing.results.push({ index, result });
      return;
    }

    groups.set(result.group, {
      name: result.group,
      results: [{ index, result }],
      slug: `group-${groups.size}`,
    });
  });

  return [...groups.values()];
}

function getStatusMessage({
  errorMessage,
  isLoading,
  query,
  resultCount,
}: {
  errorMessage: string;
  isLoading: boolean;
  query: string;
  resultCount: number;
}) {
  if (isLoading) return "Aranıyor…";
  if (errorMessage) return errorMessage;

  const validation = prepareGlobalSearchQuery(query);

  if (!query.trim()) return "Modül, kod veya kayıt adı yazın.";
  if (!validation.valid && validation.reason === "too-short") {
    return "Arama için en az 2 karakter yazın.";
  }
  if (resultCount === 0) return "Bu kapsamda eşleşen sonuç bulunamadı.";
  return `${resultCount} sonuç bulundu.`;
}

function isSafeInternalHref(href: string) {
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("\\");
}
