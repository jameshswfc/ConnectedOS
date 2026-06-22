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
  permissionLevel: PermissionLevel;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | string | null;
};

type RoleOption = { id: string; name: string };

export function AdminUserManagement({ users, roles }: { users: UserRow[]; roles: RoleOption[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function createUser(formData: FormData) {
    setMessage(null);
    const response = await fetch("/api/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        roleId: formData.get("roleId"),
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
    setMessage(null);
    const response = await fetch(`/api/v1/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        roleId: formData.get("roleId"),
        permissionLevel: formData.get("permissionLevel"),
        isActive: formData.get("isActive") === "on"
      })
    });
    setMessage(response.ok ? "User updated." : await friendlyActionError(response, "User could not be updated."));
    if (response.ok) router.refresh();
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
      <div className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <form action={(formData) => updateUser(user.id, formData)} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <input name="name" required defaultValue={user.displayName} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              <input name="email" type="email" required defaultValue={user.email} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              <RoleSelect roles={roles} defaultValue={user.roleId} />
              <PermissionLevelSelect defaultValue={user.permissionLevel} />
              <label className="flex items-center gap-2 text-sm text-slate-700"><input name="isActive" type="checkbox" defaultChecked={user.isActive} /> Active</label>
              <Button type="submit" variant="secondary">Save</Button>
            </form>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="text-sm text-slate-600 xl:col-span-2">Last login: {formatDate(user.lastLoginAt)} · Status: {user.isActive ? "Active" : "Inactive"}</div>
              <form action={(formData) => resetPassword(user.id, formData)} className="flex flex-wrap gap-2 xl:col-span-3">
                <input name="password" type="password" required placeholder="New password" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <input name="confirmPassword" type="password" required placeholder="Confirm" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <Button type="submit" variant="secondary">Reset Password</Button>
              </form>
              <Button type="button" variant="ghost" disabled={!user.isActive} onClick={() => deactivateUser(user.id)}>Deactivate</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoleSelect({ roles, defaultValue }: { roles: RoleOption[]; defaultValue?: string }) {
  return (
    <select name="roleId" required defaultValue={defaultValue ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
      <option value="">Select role</option>
      {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
    </select>
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
