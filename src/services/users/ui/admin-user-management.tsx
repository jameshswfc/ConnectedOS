"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PermissionLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";

type UserRow = {
  id: string;
  displayName: string;
  email: string;
  roleId: string;
  role?: { id: string; name: string };
  additionalRoles?: RoleOption[];
  permissionLevel: PermissionLevel;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | string | null;
  microsoftId?: string | null;
};

type RoleOption = { id: string; name: string };

export function AdminUserManagement({ users, roles, microsoftEnabled = false }: { users: UserRow[]; roles: RoleOption[]; microsoftEnabled?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);

  async function linkMicrosoft(userId: string, formData: FormData) {
    if (linking) return;
    setLinking(userId);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/users/${userId}/microsoft`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectId: formData.get("objectId") })
      });
      setMessage(response.ok ? "Microsoft identity linked. Existing roles and records are unchanged." : await friendlyActionError(response, "Unable to link Microsoft account."));
      if (response.ok) router.refresh();
    } catch { setMessage("Unable to link Microsoft account. Please try again."); }
    finally { setLinking(null); }
  }

  async function createUser(formData: FormData) {
    setMessage(null);
    const response = await fetch("/api/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        roleId: formData.get("roleId"),
        additionalRoleIds: formData.getAll("additionalRoleIds"),
        permissionLevel: formData.get("permissionLevel"),
        isActive: formData.get("isActive") === "on",
        password: formData.get("password"),
        confirmPassword: formData.get("confirmPassword")
      })
    });
    setMessage(response.ok ? "User created." : await friendlyActionError(response, "User could not be created."));
    if (response.ok) router.refresh();
  }

  async function updateUser(userId: string, formData: FormData) {
    if (saving) return;
    setSaving(userId);
    setMessage(null);
    try {
    const response = await fetch(`/api/v1/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        roleId: formData.get("roleId"),
        additionalRoleIds: formData.getAll("additionalRoleIds"),
        permissionLevel: formData.get("permissionLevel"),
        isActive: formData.get("isActive") === "on"
      })
    });
    setMessage(response.ok ? "User updated." : await friendlyActionError(response, "User could not be updated."));
    if (response.ok) router.refresh();
    } catch { setMessage("Unable to save user roles. Please try again."); }
    finally { setSaving(null); }
  }

  async function archiveUser(userId: string) {
    if (saving) return;
    setSaving(userId);
    try {
      const response = await fetch(`/api/v1/users/${userId}/archive`, { method: "POST" });
      setMessage(response.ok ? "User archived. Access remains blocked and history is preserved." : await friendlyActionError(response, "Unable to archive user."));
      if (response.ok) { setArchiving(null); router.refresh(); }
    } catch { setMessage("Unable to archive user. Please try again."); }
    finally { setSaving(null); }
  }

  async function resetPassword(userId: string, formData: FormData) {
    setMessage(null);
    const response = await fetch(`/api/v1/users/${userId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: formData.get("password"),
        confirmPassword: formData.get("confirmPassword"),
        mustChangePassword: true
      })
    });
    setMessage(response.ok ? "Password reset." : await friendlyActionError(response, "Password reset failed."));
    if (response.ok) router.refresh();
  }

  async function deactivateUser(userId: string) {
    setMessage(null);
    const response = await fetch(`/api/v1/users/${userId}/deactivate`, { method: "POST" });
    setMessage(response.ok ? "User deactivated." : await friendlyActionError(response, "User could not be deactivated."));
    if (response.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      {message ? <p className="rounded-md border border-brand-100 bg-white px-3 py-2 text-sm text-brand-900">{message}</p> : null}
      <details open={!microsoftEnabled}>
      <summary className="mb-3 cursor-pointer text-sm font-medium text-brand-700">Create a local account</summary>
      <form action={createUser} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
        <input name="name" required placeholder="Name" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <input name="email" type="email" required placeholder="Email" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <RoleSelect roles={roles} />
        <PermissionLevelSelect />
        <input name="password" type="password" required placeholder="Initial password" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <input name="confirmPassword" type="password" required placeholder="Confirm password" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <label className="flex items-center gap-2 text-sm text-slate-700"><input name="isActive" type="checkbox" defaultChecked /> Active</label>
        <Button type="submit">Add User</Button>
      </form>
      </details>
      <div className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <details className="mb-3 border-b border-slate-100 pb-3">
              <summary className="cursor-pointer text-sm font-medium text-brand-700">Microsoft 365: {user.microsoftId ? "Linked" : "Not linked"}</summary>
              {user.microsoftId ? <p className="mt-2 break-all text-xs text-slate-600">Identity: {user.microsoftId}</p> : <form action={(data) => linkMicrosoft(user.id, data)} className="mt-3 flex flex-wrap items-end gap-3">
                <label className="text-sm text-slate-700">Microsoft Entra user Object ID<input name="objectId" required aria-label={`Microsoft Object ID for ${user.displayName}`} className="mt-1 block h-10 w-80 max-w-full rounded-md border border-slate-300 px-3 text-sm" /></label>
                <Button type="submit" variant="secondary" disabled={linking !== null}>{linking === user.id ? "Linking..." : "Link Microsoft Account"}</Button>
              </form>}
            </details>
            <form action={(formData) => updateUser(user.id, formData)} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <input name="name" required defaultValue={user.displayName} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              <input name="email" type="email" required defaultValue={user.email} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              <RoleSelect key={`${user.roleId}:${user.additionalRoles?.map((role) => role.id).join(",")}`} roles={roles} defaultValue={user.roleId} additionalRoles={user.additionalRoles} />
              <PermissionLevelSelect defaultValue={user.permissionLevel} />
              <label className="flex items-center gap-2 text-sm text-slate-700"><input name="isActive" type="checkbox" defaultChecked={user.isActive} /> Active</label>
              <Button type="submit" variant="secondary" disabled={saving !== null}>{saving === user.id ? "Saving..." : "Save"}</Button>
            </form>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="text-sm text-slate-600 xl:col-span-2">Last login: {formatDate(user.lastLoginAt)} · Status: {user.isActive ? "Active" : "Inactive"}</div>
              <form action={(formData) => resetPassword(user.id, formData)} className="flex flex-wrap gap-2 xl:col-span-3">
                <input name="password" type="password" required placeholder="New password" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <input name="confirmPassword" type="password" required placeholder="Confirm" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <Button type="submit" variant="secondary">Reset Password</Button>
              </form>
              <Button type="button" variant="ghost" disabled={!user.isActive} onClick={() => deactivateUser(user.id)}>Deactivate</Button>
              {!user.isActive ? <Button type="button" variant="secondary" onClick={() => setArchiving(user.id)}>Archive User</Button> : null}
            </div>
            {archiving === user.id ? <div role="dialog" aria-label={`Archive ${user.displayName}`} className="mt-3 space-y-3 border-t border-slate-200 pt-3">
              <p className="text-sm text-slate-700">Archive {user.displayName}? Their account will disappear from this list. Sign-in stays blocked and historical records are retained.</p>
              <div className="flex gap-2"><Button type="button" variant="secondary" disabled={saving !== null} onClick={() => setArchiving(null)}>Cancel</Button><Button type="button" disabled={saving !== null} onClick={() => archiveUser(user.id)}>Confirm Archive</Button></div>
            </div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function RoleSelect({ roles, defaultValue, additionalRoles = [] }: { roles: RoleOption[]; defaultValue?: string; additionalRoles?: RoleOption[] }) {
  const [primary, setPrimary] = useState(defaultValue ?? "");
  const [selected, setSelected] = useState(additionalRoles.map((role) => role.id));
  const basic = !primary || roles.find((role) => role.id === primary)?.name === "Staff";
  return (
    <div className="min-w-0 space-y-2">
    <select name="roleId" aria-label="Primary role" required value={primary} onChange={(event) => {
      const id = event.target.value;
      setPrimary(id);
      setSelected(roles.find((role) => role.id === id)?.name === "Staff" ? [] : selected.filter((value) => value !== id));
    }} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
      <option value="">Select role</option>
      {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
    </select>
    <details><summary className="cursor-pointer text-sm text-brand-700">Additional roles{selected.length ? ` (${selected.length})` : ""}</summary>
      <fieldset disabled={basic} className="mt-2 space-y-2"><legend className="sr-only">Additional business roles</legend>
        {roles.filter((role) => !["Staff", "Administrator"].includes(role.name) && role.id !== primary).map((role) => <label key={role.id} className="flex items-start gap-2 text-sm text-slate-700">
          <input name="additionalRoleIds" type="checkbox" value={role.id} checked={selected.includes(role.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, role.id] : selected.filter((id) => id !== role.id))} className="mt-1" />{role.name}
        </label>)}
      </fieldset>
    </details></div>
  );
}

function PermissionLevelSelect({ defaultValue }: { defaultValue?: PermissionLevel }) {
  return (
    <select name="permissionLevel" required defaultValue={defaultValue ?? PermissionLevel.user} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
      <option value={PermissionLevel.user}>User</option>
      <option value={PermissionLevel.administrator}>Administrator</option>
    </select>
  );
}

function formatDate(value: Date | string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB");
}
