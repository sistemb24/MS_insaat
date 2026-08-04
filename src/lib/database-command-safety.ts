const PRODUCTION_ENVIRONMENT_NAMES = new Set(["prod", "production"]);

export function assertNonProductionDatabaseCommand(
  commandName: string,
  env: Readonly<Record<string, string | undefined>>,
) {
  const environmentNames = [env.NODE_ENV, env.NOA_RUNTIME_ENV]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().toLowerCase());

  if (environmentNames.some((value) => PRODUCTION_ENVIRONMENT_NAMES.has(value))) {
    throw new Error(
      `${commandName} production ortamında kapalıdır. Migration için yalnız db:migrate kullanın.`,
    );
  }
}
