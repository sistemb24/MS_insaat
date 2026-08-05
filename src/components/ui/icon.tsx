import type { SVGProps } from "react";

export type IconName =
  | "bank"
  | "bell"
  | "box"
  | "building"
  | "calendar"
  | "car"
  | "chart"
  | "check"
  | "chevron-down"
  | "close"
  | "code"
  | "dashboard"
  | "download"
  | "empty"
  | "error"
  | "file"
  | "gavel"
  | "info"
  | "life-buoy"
  | "loader"
  | "plus"
  | "receipt"
  | "search"
  | "settings"
  | "users"
  | "wallet"
  | "warning";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children" | "name"> & {
  label?: string;
  name: IconName;
  size?: number | string;
};

const paths: Record<IconName, React.ReactNode> = {
  bank: (
    <>
      <path d="m3 9 9-5 9 5" />
      <path d="M5 10h14" />
      <path d="M6 10v7" />
      <path d="M10 10v7" />
      <path d="M14 10v7" />
      <path d="M18 10v7" />
      <path d="M4 20h16" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  box: (
    <>
      <path d="m4 7 8-4 8 4-8 4Z" />
      <path d="M4 7v10l8 4 8-4V7" />
      <path d="M12 11v10" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V5l8-3v19" />
      <path d="M12 8h8v13" />
      <path d="M2 21h20" />
      <path d="M7 7h2M7 11h2M7 15h2M15 11h2M15 15h2" />
    </>
  ),
  calendar: (
    <>
      <rect height="17" rx="2" width="18" x="3" y="4" />
      <path d="M8 2v4M16 2v4M3 9h18" />
    </>
  ),
  car: (
    <>
      <path d="m5 11 2-5h10l2 5" />
      <path d="M3 12h18v6H3Z" />
      <path d="M6 18v2M18 18v2M7 15h.01M17 15h.01" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  code: (
    <>
      <path d="m8 9-3 3 3 3" />
      <path d="m16 9 3 3-3 3" />
      <path d="m14 5-4 14" />
    </>
  ),
  dashboard: (
    <>
      <rect height="7" rx="1" width="7" x="3" y="3" />
      <rect height="7" rx="1" width="7" x="14" y="3" />
      <rect height="7" rx="1" width="7" x="3" y="14" />
      <rect height="7" rx="1" width="7" x="14" y="14" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  empty: (
    <>
      <path d="M4 7.5 8 3h8l4 4.5V20H4Z" />
      <path d="M4 13h4l2 3h4l2-3h4" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6" />
      <path d="M12 17h.01" />
    </>
  ),
  file: (
    <>
      <path d="M6 2h8l4 4v16H6Z" />
      <path d="M14 2v5h5M9 12h6M9 16h6" />
    </>
  ),
  gavel: (
    <>
      <path d="m14 6 4 4M12 8l4 4M4 20l8-8" />
      <path d="m9 5 4-4 6 6-4 4ZM2 22h9" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <path d="M12 7h.01" />
    </>
  ),
  "life-buoy": (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="m5.64 5.64 4.24 4.24M14.12 14.12l4.24 4.24M18.36 5.64l-4.24 4.24M9.88 14.12l-4.24 4.24" />
    </>
  ),
  loader: (
    <>
      <path d="M21 12a9 9 0 1 1-6.22-8.56" />
      <path d="M15 3h4v4" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 3v18l3-2 2 2 2-2 2 2 2-2 3 2V3l-3 2-2-2-2 2-2-2-2 2Z" />
      <path d="M9 10h6M9 14h6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1-1.55V3h4v.08A1.7 1.7 0 0 0 15 4.64a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9a1.7 1.7 0 0 0 1.55 1H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M16 4a4 4 0 0 1 0 8M18 15a6 6 0 0 1 4 6" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12" />
      <path d="M15 11h7v5h-7a2.5 2.5 0 0 1 0-5Z" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3 2.8 20h18.4Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
};

export function Icon({
  className,
  label,
  name,
  size = 20,
  ...props
}: IconProps) {
  return (
    <svg
      {...props}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={className}
      fill="none"
      focusable="false"
      height={size}
      role={label ? "img" : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}
