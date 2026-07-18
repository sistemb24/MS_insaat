export const EFATURA_SUPPORTED_ACTIONS = [
  "gönderim",
  "sorgulama",
  "iptal",
] as const;

export type EFaturaSupportedAction = (typeof EFATURA_SUPPORTED_ACTIONS)[number];

export function getDefaultEFaturaSupportedActions(): EFaturaSupportedAction[] {
  return [...EFATURA_SUPPORTED_ACTIONS];
}
