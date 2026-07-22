import type { ReactNode } from "react";

type FormControlProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
  id: string;
  required?: boolean;
};

type FormFieldProps = {
  children: (controlProps: FormControlProps) => ReactNode;
  error?: ReactNode;
  hint?: ReactNode;
  id: string;
  label: ReactNode;
  required?: boolean;
};

export function FormField({
  children,
  error,
  hint,
  id,
  label,
  required = false,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5 text-content">
      <label className="text-sm font-semibold leading-5" htmlFor={id}>
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="ml-1 text-danger">
              *
            </span>
            <span className="sr-only"> (zorunlu)</span>
          </>
        ) : null}
      </label>
      {children({
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        "aria-required": required ? true : undefined,
        id,
        required,
      })}
      {hint ? (
        <p className="text-xs leading-4 text-content-muted" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs font-medium leading-4 text-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
