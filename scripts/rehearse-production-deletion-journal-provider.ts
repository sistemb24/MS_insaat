import {
  createSafeProductionDeletionJournalProviderError,
  readProductionDeletionJournalProviderRehearsalConfig,
  runProductionDeletionJournalCredentialGates,
  runProductionDeletionJournalProviderRehearsal,
} from "../src/lib/production-deletion-journal-provider-rehearsal";
import {
  createProductionDeletionJournalR2Client,
  createProductionDeletionJournalR2Store,
  probeProductionDeletionJournalR2Credential,
} from "../src/lib/production-deletion-journal-r2";
import { createProductionDeletionJournalTemporaryCredentials } from "../src/lib/production-r2-temporary-credentials";

async function main() {
  const config = readProductionDeletionJournalProviderRehearsalConfig(process.env);
  const parentClient = createProductionDeletionJournalR2Client({
    accessKeyId: config.parentAccessKeyId,
    bucket: config.bucket,
    endpoint: config.endpoint,
    secretAccessKey: config.parentSecretAccessKey,
  });
  const client = await runProductionDeletionJournalCredentialGates<
    ReturnType<typeof createProductionDeletionJournalR2Client>
  >({
    probeParentCredential: () =>
      probeProductionDeletionJournalR2Credential({
        bucket: config.bucket,
        client: parentClient,
      }),
    async createTemporaryClient() {
      const temporaryCredentials =
        await createProductionDeletionJournalTemporaryCredentials({
          accountId: config.accountId,
          endpoint: config.endpoint,
          issuedAt: new Date(),
          parentAccessKeyId: config.parentAccessKeyId,
          parentSecretAccessKey: config.parentSecretAccessKey,
        });
      return createProductionDeletionJournalR2Client({
        ...temporaryCredentials,
        bucket: config.bucket,
        endpoint: config.endpoint,
      });
    },
    probeTemporaryCredential: (temporaryClient) =>
      probeProductionDeletionJournalR2Credential({
        bucket: config.bucket,
        client: temporaryClient,
      }),
  });
  let evidence;
  try {
    evidence = await runProductionDeletionJournalProviderRehearsal({
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
  } catch (error) {
    throw createSafeProductionDeletionJournalProviderError(
      "encrypted-append-read",
      error,
    );
  }
  console.log(JSON.stringify(evidence));
}

void main();
