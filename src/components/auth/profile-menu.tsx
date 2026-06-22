"use client";

import Link from "next/link";
import { KeyRound, Settings } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function ProfileMenu({ userName }: { userName?: string | null }) {
  const label = userName || "Signed in";

  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-brand-100 bg-white px-2 py-1.5 text-left text-sm text-slate-900 shadow-sm transition-colors hover:border-gold-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">{initials(label)}</span>
        <span className="hidden max-w-40 truncate font-medium sm:block">{label}</span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-lg shadow-brand-900/10">
        <Link href="/settings" className="flex items-center gap-2 rounded-md px-3 py-2 text-slate-700 hover:bg-brand-50 hover:text-brand-900">
          <Settings className="h-4 w-4" aria-hidden="true" />
          Settings
        </Link>
        <Link href="/settings/change-password" className="flex items-center gap-2 rounded-md px-3 py-2 text-slate-700 hover:bg-brand-50 hover:text-brand-900">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          Change Password
        </Link>
        <div className="mt-1 border-t border-slate-100 px-3 py-2">
          <SignOutButton />
        </div>
      </div>
    </details>
  );
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}
