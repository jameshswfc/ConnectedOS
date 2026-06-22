import Link from "next/link";
import { ShieldAlert, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AccessDenied() {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold-50 text-brand-800">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <CardTitle className="text-xl">Access denied</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-center">
        <p className="text-sm leading-6 text-slate-600">
          You do not have permission to view this page.
          <br />
          If you believe this is incorrect, please contact an administrator.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500">
            Back to Dashboard
          </Link>
          <Link href="/settings" className="inline-flex h-10 items-center justify-center rounded-md border border-brand-100 bg-white px-4 text-sm font-medium text-brand-900 transition-colors hover:border-gold-500 hover:bg-gold-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
            <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
            Go to Settings
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
