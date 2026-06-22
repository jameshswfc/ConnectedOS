import Image from "next/image";
import { LoginActions } from "@/app/login/login-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { brandAssets, brandCopy } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const initialAdmin = adminEmail ? await prisma.user.findUnique({ where: { email: adminEmail }, select: { passwordHash: true } }) : null;
  const showDevelopmentLogin = process.env.NODE_ENV === "development" && !initialAdmin?.passwordHash;

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-900 px-4 py-10"
      style={{
        backgroundImage: `linear-gradient(120deg, rgba(38,18,63,0.94), rgba(63,36,100,0.82)), url(${brandAssets.backgrounds.login})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.28),transparent_34%),linear-gradient(180deg,transparent,rgba(38,18,63,0.32))]" aria-hidden="true" />
      <div
        className="absolute right-[-8rem] top-10 h-[34rem] w-[42rem] bg-contain bg-right-top bg-no-repeat opacity-20"
        style={{ backgroundImage: `url(${brandAssets.graphics.hotelTech})` }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-6rem] left-[-4rem] h-[28rem] w-[38rem] bg-contain bg-left-bottom bg-no-repeat opacity-15"
        style={{ backgroundImage: `url(${brandAssets.graphics.networkPattern})` }}
        aria-hidden="true"
      />
      <Card className="relative w-full max-w-md border-white/15 bg-white/95 shadow-2xl shadow-brand-900/40">
        <CardHeader className="flex flex-col items-center border-b-brand-100 text-center">
          <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-lg bg-white p-3 shadow-sm ring-1 ring-brand-100">
            <Image src={brandAssets.logo} alt="Connected Hospitality" width={84} height={84} className="h-full w-full object-contain" priority />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">{brandCopy.companyName}</p>
          <CardTitle className="text-2xl">{brandCopy.platformName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-6 text-slate-600">
            Sign in with your ConnectedOS email address and local password.
          </p>
          <LoginActions showDevelopmentLogin={showDevelopmentLogin} />
        </CardContent>
      </Card>
    </main>
  );
}
