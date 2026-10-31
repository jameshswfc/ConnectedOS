"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Code2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { microsoftLoginMessage } from "@/services/auth/microsoft-login-messages";

type LoginActionsProps = {
  showDevelopmentLogin: boolean;
  microsoftEnabled?: boolean;
  loginError?: string;
};

export function LoginActions({ showDevelopmentLogin, microsoftEnabled = false, loginError }: LoginActionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const getDashboardCallbackUrl = () => `${window.location.origin}/dashboard`;

  async function submit(formData: FormData) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
        callbackUrl: getDashboardCallbackUrl()
      });

      if (result?.ok && result.url) {
        window.location.href = result.url;
        return;
      }

      if (result?.error === "INACTIVE_USER") {
        setError("Your account is inactive. Contact an administrator.");
        return;
      }

      setError("Invalid email or password");
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const localForm = (
      <form action={submit} className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">Email address<input name="email" type="email" autoComplete="email" required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-gold-500/40" /></label>
        <label className="block text-sm font-medium text-slate-700">Password<input name="password" type="password" autoComplete="current-password" required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-gold-500/40" /></label>
        <Button className="w-full" type="submit" disabled={pending}>
          <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
  );

  return (
    <div className="space-y-3">
      {error || loginError ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error || microsoftLoginMessage(loginError)}</p> : null}
      {microsoftEnabled ? <>
        <Button className="w-full" disabled={pending} onClick={async () => {
          setPending(true);
          try { await signIn("azure-ad", { callbackUrl: getDashboardCallbackUrl() }); }
          catch { setError("Unable to start Microsoft sign-in. Please try again."); setPending(false); }
        }}><LogIn className="mr-2 h-4 w-4" aria-hidden="true" />Sign in with Microsoft 365</Button>
        <details className="border-t border-slate-200 pt-3">
          <summary className="mb-3 cursor-pointer text-sm font-medium text-brand-700 focus-visible:outline-gold-500">Local account sign-in</summary>
          {localForm}
        </details>
      </> : localForm}
      {showDevelopmentLogin ? <p className="text-xs text-slate-500"><Code2 className="mr-1 inline h-3 w-3" aria-hidden="true" />Development bypass is parked while local login is active.</p> : null}
    </div>
  );
}
