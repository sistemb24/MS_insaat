import {
  createProductionR2ProtocolDiagnosticAws4FetchClient,
  createProductionR2ProtocolDiagnosticAwsSdkClient,
  probeProductionR2CredentialWithAws4Fetch,
  probeProductionR2CredentialWithAwsSdk,
  readProductionR2TemporaryCredentialProtocolDiagnosticConfig,
  runProductionR2TemporaryCredentialProtocolDiagnostic,
} from "../src/lib/production-r2-temporary-credential-protocol-diagnostic";
import { createProductionDeletionJournalTemporaryCredentials } from "../src/lib/production-r2-temporary-credentials";

async function main() {
  const config = readProductionR2TemporaryCredentialProtocolDiagnosticConfig(
    process.env,
  );
  const parentClient = createProductionR2ProtocolDiagnosticAwsSdkClient({
    accessKeyId: config.parentAccessKeyId,
    bucket: config.bucket,
    endpoint: config.endpoint,
    secretAccessKey: config.parentSecretAccessKey,
  });

  const evidence = await runProductionR2TemporaryCredentialProtocolDiagnostic({
    createTemporaryCredentials: () =>
      createProductionDeletionJournalTemporaryCredentials({
        accountId: config.accountId,
        endpoint: config.endpoint,
        issuedAt: new Date(),
        parentAccessKeyId: config.parentAccessKeyId,
        parentSecretAccessKey: config.parentSecretAccessKey,
      }),
    probeAws4FetchTemporaryCredential: async (credentials) => {
      const client = createProductionR2ProtocolDiagnosticAws4FetchClient({
        ...credentials,
        bucket: config.bucket,
        endpoint: config.endpoint,
      });
      await probeProductionR2CredentialWithAws4Fetch({
        bucket: config.bucket,
        client,
        endpoint: config.endpoint,
      });
    },
    probeAwsSdkTemporaryCredential: async (credentials) => {
      const client = createProductionR2ProtocolDiagnosticAwsSdkClient({
        ...credentials,
        bucket: config.bucket,
        endpoint: config.endpoint,
      });
      await probeProductionR2CredentialWithAwsSdk({
        bucket: config.bucket,
        client,
      });
    },
    probeParentCredential: () =>
      probeProductionR2CredentialWithAwsSdk({
        bucket: config.bucket,
        client: parentClient,
      }),
    releaseId: config.releaseId,
  });

  console.log(JSON.stringify(evidence));
}

void main();
