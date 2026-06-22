"use client";

import { signOut } from "next-auth/react";

export function loginCallbackUrl(origin: string) {
  return `${origin}/login`;
}

export function SignOutButton() {
  return (
    <button
      className="text-slate-500 hover:text-slate-900"
      type="button"
      onClick={() => signOut({ callbackUrl: loginCallbackUrl(window.location.origin) })}
    >
      Sign out
    </button>
  );
}
