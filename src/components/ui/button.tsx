import type { ButtonHTMLAttributes, ReactNode } from "react";

import { classNames } from "./class-names";
import { Icon } from "./icon";

export type ButtonVariant = "danger" | "ghost" | "primary" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isPending?: boolean;
  leadingIcon?: ReactNode;
  pendingLabel?: string;
  size?: "md" | "sm";
  trailingIcon?: ReactNode;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  danger:
    "border-danger bg-danger text-on-danger hover:bg-danger-strong focus-visible:outline-danger",
  ghost:
    "border-transparent bg-transparent text-content-subtle hover:bg-surface-muted hover:text-content",
  primary:
    "border-brand-primary bg-brand-primary text-on-brand hover:bg-brand-primary-strong focus-visible:outline-brand-primary",
  secondary:
    "border-divider bg-surface-raised text-content hover:border-outline-strong hover:bg-surface-muted",
};

const sizeClasses = {
  md: "min-h-10 px-4 py-2 text-sm",
  sm: "min-h-9 px-3 py-1.5 text-xs",
} as const;

export function Button({
  children,
  className,
  disabled,
  isPending = false,
  leadingIcon,
  pendingLabel = "İşleniyor",
  size = "md",
  trailingIcon,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-busy={isPending || undefined}
      className={classNames(
        "inline-flex items-center justify-center gap-2 rounded-ui-control border font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || isPending}
      type={type}
    >
      {isPending ? <Icon className="animate-spin" name="loader" size={16} /> : leadingIcon}
      <span>{isPending ? pendingLabel : children}</span>
      {isPending ? null : trailingIcon}
    </button>
  );
}
