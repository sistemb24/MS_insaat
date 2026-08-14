import type {
  PartyParityLegacyRecord,
  PartyParityPartyRecord,
  PartyParityRoleRecord,
  PartyParityScope,
  PartyParitySnapshot,
} from "./party-parity-read-model";

export type PartyParitySnapshotPrismaClient = {
  entityRecord: {
    findMany(input: unknown): Promise<PartyParityLegacyRecord[]>;
  };
  party: {
    findMany(input: unknown): Promise<PartyParityPartyRecord[]>;
  };
  partyRole: {
    findMany(input: unknown): Promise<PartyParityRoleRecord[]>;
  };
};

export async function readPartyParitySnapshotFromClient(
  client: PartyParitySnapshotPrismaClient,
  scope: PartyParityScope,
): Promise<PartyParitySnapshot> {
  const legacyRecords = await client.entityRecord.findMany({
    orderBy: [{ slug: "asc" }, { code: "asc" }],
    select: {
      code: true,
      companyId: true,
      data: true,
      periodId: true,
      slug: true,
      tenantId: true,
    },
    where: {
      ...scope,
      slug: { in: ["musteriler", "taseronlar", "tedarikciler"] },
    },
  });
  const parties = await client.party.findMany({
    orderBy: { id: "asc" },
    select: {
      companyId: true,
      displayName: true,
      email: true,
      id: true,
      normalizedName: true,
      normalizedTaxNumber: true,
      periodId: true,
      phone: true,
      status: true,
      taxNumber: true,
      tenantId: true,
    },
    where: scope,
  });
  const roles = await client.partyRole.findMany({
    orderBy: [{ kind: "asc" }, { normalizedCode: "asc" }],
    select: {
      code: true,
      companyId: true,
      id: true,
      kind: true,
      legacyCode: true,
      legacySlug: true,
      normalizedCode: true,
      partyId: true,
      periodId: true,
      status: true,
      tenantId: true,
    },
    where: scope,
  });

  return { legacyRecords, parties, roles };
}
