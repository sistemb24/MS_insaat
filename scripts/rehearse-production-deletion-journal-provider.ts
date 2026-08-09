import {
  readProductionDeletionJournalProviderRehearsalConfig,
  runProductionDeletionJournalProviderRehearsal,
} from "../src/lib/production-deletion-journal-provider-rehearsal";
import {
  createProductionDeletionJournalR2Client,
  createProductionDeletionJournalR2Store,
} from "../src/lib/production-deletion-journal-r2";
import { createProductionDeletionJournalTemporaryCredentials } from "../src/lib/production-r2-temporary-credentials";

async function main() {
  const config = readProductionDeletionJournalProviderRehearsalConfig(process.env);
  const temporaryCredentials =
    createProductionDeletionJournalTemporaryCredentials({
      accountId: config.accountId,
      endpoint: config.endpoint,
      issuedAt: new Date(),
      parentAccessKeyId: config.parentAccessKeyId,
      parentSecretAccessKey: config.parentSecretAccessKey,
    });
  const client = createProductionDeletionJournalR2Client({
    ...temporaryCredentials,
    bucket: config.bucket,
    endpoint: config.endpoint,
  });
  const evidence = await runProductionDeletionJournalProviderRehearsal({
    crypto: config.crypto,
    now: new Date(),
    releaseId: config.releaseId,
    runAttempt: config.runAttempt,
    runId: config.runId,
    store: createProductionDeletionJournalR2Store({
      bucket: config.bucket,
      client,
    }),
  });
  console.log(JSON.stringify(evidence));
}

void main();
