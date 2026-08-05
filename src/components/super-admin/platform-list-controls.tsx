import Link from "next/link";

import { Button, FormField } from "@/components/ui";

type SortOption = { label: string; value: string };

type PlatformListControlsProps = {
  page: number;
  path: string;
  query: string;
  sort: string;
  sortOptions: SortOption[];
  totalPages: number;
};

export function PlatformListControls({
  page,
  path,
  query,
  sort,
  sortOptions,
  totalPages,
}: PlatformListControlsProps) {
  const idPrefix = path.replace(/[^a-z0-9]+/gi, "-");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <form className="flex flex-1 flex-col gap-2 sm:flex-row" method="get">
        <div className="flex-1">
          <FormField id={`${idPrefix}-query`} label="Filtre">
            {(controlProps) => (
              <input
                {...controlProps}
                className="h-10 w-full rounded-ui-control border border-divider bg-surface-raised px-3 text-sm text-content"
                defaultValue={query}
                maxLength={100}
                name="q"
                placeholder="Ad, tenant veya kayıt türü"
              />
            )}
          </FormField>
        </div>
        <FormField id={`${idPrefix}-sort`} label="Sıralama">
          {(controlProps) => (
            <select
              {...controlProps}
              className="h-10 rounded-ui-control border border-divider bg-surface-raised px-3 text-sm text-content"
              defaultValue={sort}
              name="sort"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <Button className="self-end" type="submit">
          Uygula
        </Button>
      </form>
      <nav aria-label="Sayfalama" className="flex items-center gap-2 text-sm">
        <PageLink
          disabled={page <= 1}
          href={pageHref(path, page - 1, query, sort)}
          label="Önceki"
        />
        <span className="text-content-subtle">
          {page} / {totalPages}
        </span>
        <PageLink
          disabled={page >= totalPages}
          href={pageHref(path, page + 1, query, sort)}
          label="Sonraki"
        />
      </nav>
    </div>
  );
}

function PageLink({
  disabled,
  href,
  label,
}: {
  disabled: boolean;
  href: string;
  label: string;
}) {
  return disabled ? (
    <span aria-disabled="true" className="rounded-ui-control border border-divider px-3 py-2 text-content-subtle opacity-50">
      {label}
    </span>
  ) : (
    <Link className="rounded-ui-control border border-divider px-3 py-2 text-content" href={href}>
      {label}
    </Link>
  );
}

function pageHref(path: string, page: number, query: string, sort: string) {
  const params = new URLSearchParams({ page: String(page), sort });
  if (query) params.set("q", query);
  return `${path}?${params.toString()}`;
}
