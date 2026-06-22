"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";

export function AccountSettingsForms({ user, passwordOnly = false, redirectAfterPasswordChange }: { user: { displayName: string; email: string; role?: { name: string }; permissionLevel: string }; passwordOnly?: boolean; redirectAfterPasswordChange?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function updateProfile(formData: FormData) {
    setMessage(null);
    const response = await fetch("/api/v1/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formData.get("name") })
    });
    setMessage(response.ok ? "Profile updated." : await friendlyActionError(response, "Profile update failed."));
    if (response.ok) router.refresh();
  }

  async function changePassword(formData: FormData) {
    setMessage(null);
    const response = await fetch("/api/v1/me/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: formData.get("currentPassword"),
        password: formData.get("password"),
        confirmPassword: formData.get("confirmPassword")
      })
    });
    setMessage(response.ok ? "Password changed." : await friendlyActionError(response, "Password change failed. Check your current password and password rules."));
    if (response.ok && redirectAfterPasswordChange) {
      router.push(redirectAfterPasswordChange);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {message ? <p className="rounded-md border border-brand-100 bg-white px-3 py-2 text-sm text-brand-900">{message}</p> : null}
      {!passwordOnly ? (
        <form action={updateProfile} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Name<input name="name" required defaultValue={user.displayName} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>
          <label className="block text-sm font-medium text-slate-700">Email<input value={user.email} readOnly className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600" /></label>
          <div className="grid gap-3 md:grid-cols-2">
            <p className="text-sm text-slate-600">Role: <span className="font-medium text-slate-900">{user.role?.name ?? "-"}</span></p>
            <p className="text-sm text-slate-600">Permission level: <span className="font-medium text-slate-900">{formatPermissionLevel(user.permissionLevel)}</span></p>
          </div>
          <Button type="submit">Save Profile</Button>
        </form>
      ) : null}
      <form action={changePassword} className={passwordOnly ? "space-y-3" : "space-y-3 border-t border-slate-100 pt-4"}>
        <label className="block text-sm font-medium text-slate-700">Current password<input name="currentPassword" type="password" required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>
        <label className="block text-sm font-medium text-slate-700">New password<input name="password" type="password" required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>
        <label className="block text-sm font-medium text-slate-700">Confirm new password<input name="confirmPassword" type="password" required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>
        <p className="text-xs text-slate-500">Minimum 10 characters, with at least one letter and one number.</p>
        <Button type="submit" variant="secondary">Change Password</Button>
      </form>
    </div>
  );
}

function formatPermissionLevel(value: string) {
  return value === "administrator" ? "Administrator" : "User";
}
