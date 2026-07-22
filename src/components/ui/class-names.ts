export type ClassNameValue = false | null | string | undefined;

export function classNames(...values: ClassNameValue[]) {
  return values.filter(Boolean).join(" ");
}
