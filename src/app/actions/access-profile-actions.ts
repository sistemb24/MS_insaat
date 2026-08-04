"use server";

import { revalidatePath } from "next/cache";

import { accessProfileService } from "@/lib/access-profile-runtime";
import type {
  AccessProfileAssignmentValues,
  AccessProfileSaveValues,
  AccessProfileStatusValues,
} from "@/lib/access-profile";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";

export async function listAccessProfilesAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  return accessProfileService.list({ scope });
}

export async function saveAccessProfileAction(values: AccessProfileSaveValues) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const result = await accessProfileService.save({ scope, values });
  if (result.ok) revalidateAccessProfileConsumers();
  return result;
}

export async function changeAccessProfileStatusAction(
  values: AccessProfileStatusValues,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const result = await accessProfileService.changeStatus({ scope, values });
  if (result.ok) revalidateAccessProfileConsumers();
  return result;
}

export async function assignAccessProfileAction(
  values: AccessProfileAssignmentValues,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const result = await accessProfileService.assign({ scope, values });
  if (result.ok) revalidateAccessProfileConsumers();
  return result;
}

function revalidateAccessProfileConsumers() {
  revalidatePath("/ayarlar");
  revalidatePath("/dokuman-merkezi");
  revalidatePath("/[module]", "page");
}
