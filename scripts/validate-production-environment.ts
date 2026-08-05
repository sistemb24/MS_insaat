import "dotenv/config";

import { validateProductionEnvironment } from "../src/lib/production-environment";

validateProductionEnvironment(process.env);
console.log("Production environment sözleşmesi geçerli.");
