import { runSyntheticProductionDeletionReplayRehearsal } from "../src/lib/production-deletion-replay-rehearsal";

runSyntheticProductionDeletionReplayRehearsal()
  .then((result) => console.log(JSON.stringify(result)))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
