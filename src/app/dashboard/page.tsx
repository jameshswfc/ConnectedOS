import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { brandAssets, brandCopy } from "@/lib/brand";
import { getDashboardOverview } from "@/modules/dashboard/dashboard-service";
import { requireAuthenticatedUser } from "@/services/auth/auth-service";

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();
  const cards = await getDashboardOverview({
    userId: user.id,
    permissions: user.permissions,
    permissionLevel: user.permissionLevel,
    role: user.role
  });

  return (
    <AppShell title="Dashboard" userName={user.name}>
      <section
        className="mb-6 overflow-hidden rounded-lg border border-brand-100 bg-brand-900 text-white shadow-sm"
        style={{
          backgroundImage: `linear-gradient(115deg, rgba(38,18,63,0.96), rgba(63,36,100,0.72)), url(${brandAssets.backgrounds.dashboard})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-500">{brandCopy.tagline}</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Operations overview</h2>
            <p className="mt-2 text-sm leading-6 text-white/80">Your Connected Hospitality command centre for commercial, delivery and operational work.</p>
          </div>
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-white p-3 shadow-sm">
            <Image src={brandAssets.logo} alt="Connected Hospitality" width={68} height={68} className="h-full w-full object-contain" />
          </div>
        </div>
      </section>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/settings"><Button variant="secondary">Settings</Button></Link>
        <Link href="/notifications"><Button variant="secondary">Notifications</Button></Link>
        <Link href="/reports"><Button variant="secondary">Reports</Button></Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="h-full border-t-4 border-t-brand-700 transition hover:border-t-gold-500 hover:shadow-md">
              <CardHeader>
                <CardTitle>{card.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-brand-900">{card.value}</p>
                <p className="mt-2 text-sm text-slate-600">{card.helper}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {cards.length === 0 ? (
          <Card className="border-t-4 border-t-gold-500 md:col-span-3 xl:col-span-4">
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Your account is live, but no dashboard widgets are available for the current permission set yet. Open <Link href="/settings" className="font-medium text-brand-700">Settings</Link> or ask an administrator to review your access.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
