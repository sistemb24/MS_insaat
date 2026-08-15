import {
  evaluateProductionPartyShadowRuntimeAttestation,
  readProductionPartyShadowRuntimeAttestationConfig,
  requestProductionPartyShadowRuntimeAttestation,
} from "../src/lib/production-party-shadow-runtime-readiness";

async function main() {
  const config = readProductionPartyShadowRuntimeAttestationConfig(process.env);
  const attestation = await requestProductionPartyShadowRuntimeAttestation(config);
  const gate = evaluateProductionPartyShadowRuntimeAttestation({
    attestation,
    config,
  });
  const result = { ...attestation, blockers: gate.blockers, ready: gate.ready };
  console.log(JSON.stringify(result));
  if (!result.ready) process.exitCode = 1;
}

void main().catch(() => {
  console.error("Party shadow runtime production attestation fail-closed durdu.");
  process.exitCode = 1;
});
