import type { TenantScope } from "./tenant-scope";

export type UserScopeAccessRecord = TenantScope & {
  id: string;
  isDefault: boolean;
};

export type UserScopeAccessRepository = {
  listActiveForUser(input: { userId: string }): Promise<UserScopeAccessRecord[]>;
};
