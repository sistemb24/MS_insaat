import type { SessionScopeRecord } from "./session-scope";
import type { TenantUserRole } from "./tenant-scope";

export type SessionOption = {
  companyLabel: string;
  id: string;
  label: string;
  roleLabel: string;
  userName: string;
};

export function sessionRecordToOption(record: SessionScopeRecord): SessionOption {
  const companyLabel = `${record.companyName} / ${record.periodLabel}`;

  return {
    companyLabel,
    id: record.id,
    label: `${record.userName} · ${companyLabel}`,
    roleLabel: roleToLabel(record.userRole),
    userName: record.userName,
  };
}

function roleToLabel(role: TenantUserRole) {
  if (role === "admin") {
    return "Yönetici";
  }

  if (role === "accounting") {
    return "Muhasebe";
  }

  return "Salt Okur";
}
