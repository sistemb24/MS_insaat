export type OperationalReadiness = {
  checks: {
    database: "ready" | "unavailable";
  };
  status: "ready" | "unavailable";
};

export type OperationalReadinessDependencies = {
  checkDatabase(): Promise<unknown>;
};

export function createOperationalReadinessProbe({
  checkDatabase,
}: OperationalReadinessDependencies) {
  return async (): Promise<OperationalReadiness> => {
    try {
      await checkDatabase();

      return {
        checks: { database: "ready" },
        status: "ready",
      };
    } catch {
      return {
        checks: { database: "unavailable" },
        status: "unavailable",
      };
    }
  };
}

export function operationalResponseHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  };
}
