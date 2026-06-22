"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Code2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

type LoginActionsProps = {
  showDevelopmentLogin: boolean;
};

export function LoginActions({ showDevelopmentLogin }: LoginActionsProps) {
  const [error, setError] = useState<string | null>(null);
  const getDashboardCallbackUrl = () => `${window.location.origin}/dashboard`;

  async function submit(formData: FormData) {
    setError(null);
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
  }

  return (
    <div className="space-y-3">
      <form action={submit} className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">Email address<input name="email" type="email" autoComplete="email" required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-gold-500/40" /></label>
        <label className="block text-sm font-medium text-slate-700">Password<input name="password" type="password" autoComplete="current-password" required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-gold-500/40" /></label>
        {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <Button className="w-full" type="submit">
          <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
          Sign in
        </Button>
      </form>
      {showDevelopmentLogin ? <p className="text-xs text-slate-500"><Code2 className="mr-1 inline h-3 w-3" aria-hidden="true" />Development bypass is parked while local login is active.</p> : null}
    </div>
  );
}
