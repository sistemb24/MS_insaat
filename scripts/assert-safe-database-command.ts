import "dotenv/config";

import { assertNonProductionDatabaseCommand } from "../src/lib/database-command-safety";

const commandName = process.argv[2] ?? "database command";

assertNonProductionDatabaseCommand(commandName, process.env);
