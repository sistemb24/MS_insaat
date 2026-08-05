"use client";

import { useState } from "react";

import {
  accessProfilePermissionLabels,
  type AccessProfileAssignmentValues,
  type AccessProfileOverview,
  type AccessProfilePermissionCode,
  type AccessProfileSaveValues,
  type AccessProfileSnapshot,
  type AccessProfileStatusValues,
} from "@/lib/access-profile";
import type { AccessProfileResult } from "@/lib/access-profile-service";

type ProfileMutation = AccessProfileResult<{
  idempotent: boolean;
  profile: AccessProfileSnapshot;
}>;
type AssignmentMutation = AccessProfileResult<{
  assignment: AccessProfileOverview["users"][number]["assignment"];
  idempotent: boolean;
}>;

export function AccessProfilePanel({
  activeUsers,
  onAssign,
  onChangeStatus,
  onSave,
  overview: initialOverview,
}: {
  activeUsers?: Array<{
    email: string;
    fullName: string;
    role: string;
    userId?: string;
  }>;
  onAssign?: (values: AccessProfileAssignmentValues) => Promise<AssignmentMutation>;
  onChangeStatus?: (values: AccessProfileStatusValues) => Promise<ProfileMutation>;
  onSave?: (values: AccessProfileSaveValues) => Promise<ProfileMutation>;
  overview: AccessProfileOverview;
}) {
  const [overview, setOverview] = useState(initialOverview);
  const [draft, setDraft] = useState<AccessProfileSnapshot | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<AccessProfilePermissionCode[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const visibleUsers = activeUsers
    ? activeUsers
        .filter((user) => user.role === "viewer" && user.userId)
        .map((user) => ({
          assignment:
            overview.users.find((row) => row.userId === user.userId)
              ?.assignment ?? null,
          email: user.email,
          name: user.fullName,
          userId: user.userId!,
        }))
    : overview.users;

  function edit(profile?: AccessProfileSnapshot) {
    setDraft(profile ?? null);
    setName(profile?.name ?? "");
    setDescription(profile?.description ?? "");
    setPermissions(profile?.permissions ?? []);
    setNotice("");
  }

  async function save() {
    if (!overview.canManage || !onSave) return;
    setBusy(true);
    const result = await onSave({
      description,
      expectedRevisionNo: draft?.revisionNo ?? 0,
      id: draft?.id,
      name,
      permissions,
      requestKey: requestKey("save"),
    });
    setBusy(false);
    if (!result.ok) return setNotice(result.errors.join(" "));
    setOverview((current) => ({
      ...current,
      profiles: upsertProfile(current.profiles, result.data.profile),
    }));
    edit();
    setName("");
    setNotice("Yetki profili kaydedildi.");
  }

  async function changeStatus(profile: AccessProfileSnapshot) {
    if (!overview.canManage || !onChangeStatus) return;
    setBusy(true);
    const result = await onChangeStatus({
      expectedRevisionNo: profile.revisionNo,
      id: profile.id,
      requestKey: requestKey("status"),
      status: profile.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
    });
    setBusy(false);
    if (!result.ok) return setNotice(result.errors.join(" "));
    setOverview((current) => ({
      ...current,
      profiles: upsertProfile(current.profiles, result.data.profile),
    }));
    setNotice("Profil durumu güncellendi.");
  }

  async function assign(userId: string, profileId: string) {
    if (!overview.canManage || !onAssign) return;
    const user = visibleUsers.find((row) => row.userId === userId);
    setBusy(true);
    const result = await onAssign({
      expectedRevisionNo: user?.assignment?.revisionNo ?? 0,
      profileId: profileId || null,
      requestKey: requestKey("assignment"),
      userId,
    });
    setBusy(false);
    if (!result.ok) return setNotice(result.errors.join(" "));
    setOverview((current) => {
      const exists = current.users.some((row) => row.userId === userId);
      const activeUser = activeUsers?.find((row) => row.userId === userId);
      return {
        ...current,
        users: exists
          ? current.users.map((row) =>
              row.userId === userId
                ? { ...row, assignment: result.data.assignment }
                : row,
            )
          : activeUser
            ? [
                ...current.users,
                {
                  assignment: result.data.assignment,
                  email: activeUser.email,
                  name: activeUser.fullName,
                  userId,
                },
              ]
            : current.users,
      };
    });
    setNotice("Kullanıcı yetki profili güncellendi.");
  }

  return (
    <section
      aria-labelledby="access-profile-title"
      className="rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
            Doküman Merkezi pilotu
          </p>
          <h2 className="mt-1 text-lg font-bold text-content" id="access-profile-title">
            Özel Yetki Profilleri
          </h2>
          <p className="mt-1 text-sm text-content-subtle">
            Görüntüleyici kullanıcılar için dönem bazlı, deny-by-default doküman yetkileri.
          </p>
        </div>
        {overview.canManage ? (
          <button
            className="rounded-ui-control bg-brand-primary px-4 py-2 text-sm font-bold text-on-brand"
            onClick={() => edit()}
            type="button"
          >
            Yeni Profil
          </button>
        ) : null}
      </div>

      {overview.canManage ? (
        <div className="mt-4 grid gap-3 rounded-ui-control border border-divider bg-surface-muted p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold text-content">
              Profil adı
              <input className="mt-1 w-full rounded-ui-control border border-divider bg-surface-raised px-3 py-2 font-normal" maxLength={80} onChange={(event) => setName(event.target.value)} value={name} />
            </label>
            <label className="text-sm font-semibold text-content">
              Açıklama
              <input className="mt-1 w-full rounded-ui-control border border-divider bg-surface-raised px-3 py-2 font-normal" maxLength={240} onChange={(event) => setDescription(event.target.value)} value={description} />
            </label>
          </div>
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-1 text-sm font-bold text-content">Doküman yetkileri</legend>
            {overview.permissions.map((permission) => (
              <label className="flex items-center gap-2 text-sm text-content" key={permission.code}>
                <input
                  checked={permissions.includes(permission.code)}
                  onChange={(event) =>
                    setPermissions((current) =>
                      event.target.checked
                        ? [...current, permission.code]
                        : current.filter((code) => code !== permission.code),
                    )
                  }
                  type="checkbox"
                />
                {permission.label}
              </label>
            ))}
          </fieldset>
          <div>
            <button className="rounded-ui-control bg-brand-primary px-4 py-2 text-sm font-bold text-on-brand disabled:opacity-50" disabled={busy || !name.trim() || !onSave} onClick={() => void save()} type="button">
              {draft ? "Profili Güncelle" : "Profili Kaydet"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-ui-control border border-divider">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase text-content-subtle"><tr><th className="px-3 py-2">Profil</th><th className="px-3 py-2">Yetkiler</th><th className="px-3 py-2">Durum</th><th className="px-3 py-2 print:hidden">İşlem</th></tr></thead>
          <tbody className="divide-y divide-divider">
            {overview.profiles.map((profile) => (
              <tr key={profile.id}>
                <td className="px-3 py-2"><p className="font-semibold">{profile.name}</p><p className="text-xs text-content-subtle">{profile.description}</p></td>
                <td className="px-3 py-2 text-content-subtle">{profile.permissions.map((code) => accessProfilePermissionLabels[code]).join(", ") || "Yetki yok"}</td>
                <td className="px-3 py-2">{profile.status === "ACTIVE" ? "Aktif" : "Pasif"}</td>
                <td className="px-3 py-2 print:hidden">{overview.canManage ? <div className="flex gap-2"><button className="rounded-ui-control border border-divider px-3 py-1.5 text-xs font-semibold" onClick={() => edit(profile)} type="button">Düzenle</button><button className="rounded-ui-control border border-divider px-3 py-1.5 text-xs font-semibold" disabled={busy} onClick={() => void changeStatus(profile)} type="button">{profile.status === "ACTIVE" ? "Pasife Al" : "Aktifleştir"}</button></div> : "Salt okunur"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <h3 className="font-bold text-content">Görüntüleyici Kullanıcı Atamaları</h3>
        <div className="mt-2 grid gap-2">
          {visibleUsers.map((user) => (
            <label className="grid gap-2 rounded-ui-control border border-divider p-3 sm:grid-cols-[1fr_280px] sm:items-center" key={user.userId}>
              <span><span className="block font-semibold">{user.name}</span><span className="text-xs text-content-subtle">{user.email ?? user.userId}</span></span>
              <select className="rounded-ui-control border border-divider bg-surface-muted px-3 py-2" disabled={!overview.canManage || busy || !onAssign} onChange={(event) => void assign(user.userId, event.target.value)} value={user.assignment?.profileId ?? ""}>
                <option value="">Profil yok (eski rol davranışı)</option>
                {overview.profiles.filter((profile) => profile.status === "ACTIVE").map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
              </select>
            </label>
          ))}
          {visibleUsers.length === 0 ? <p className="text-sm text-content-subtle">Bu dönemde aktif görüntüleyici kullanıcı yok.</p> : null}
        </div>
      </div>
      {notice ? <p className="mt-3 text-sm font-semibold text-content-subtle" role="status">{notice}</p> : null}
    </section>
  );
}

function upsertProfile(rows: AccessProfileSnapshot[], saved: AccessProfileSnapshot) {
  return [...rows.filter((row) => row.id !== saved.id), saved].sort((a, b) =>
    a.name.localeCompare(b.name, "tr-TR"),
  );
}
function requestKey(action: string) {
  return `access-profile-${action}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
