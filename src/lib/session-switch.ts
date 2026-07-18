export type SessionSwitchForm = {
  redirectTo: string;
  sessionId: string;
};

export function parseSessionSwitchForm(formData: FormData): SessionSwitchForm {
  return {
    redirectTo: normalizeRedirect(formData.get("redirectTo")),
    sessionId: String(formData.get("sessionId") ?? "").trim(),
  };
}

function normalizeRedirect(value: FormDataEntryValue | null) {
  const redirectTo = String(value ?? "/");

  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "/";
  }

  return redirectTo;
}
