"use client";

import { usePathname } from "next/navigation";
import { brandAssets, brandColors } from "@/lib/brand";

export type BrandedBackgroundVariant = "default" | "dashboard" | "crm" | "quotes" | "presales" | "admin";

type BrandedBackgroundProps = {
  variant?: BrandedBackgroundVariant;
};

const variantTone: Record<BrandedBackgroundVariant, { top: string; middle: string; accent: string; graphicOpacity: number }> = {
  default: { top: "rgba(63,36,100,0.10)", middle: "rgba(212,175,55,0.10)", accent: "rgba(200,121,61,0.08)", graphicOpacity: 0.08 },
  dashboard: { top: "rgba(63,36,100,0.13)", middle: "rgba(212,175,55,0.12)", accent: "rgba(200,121,61,0.08)", graphicOpacity: 0.1 },
  crm: { top: "rgba(63,36,100,0.09)", middle: "rgba(212,175,55,0.09)", accent: "rgba(63,36,100,0.06)", graphicOpacity: 0.075 },
  quotes: { top: "rgba(63,36,100,0.11)", middle: "rgba(212,175,55,0.12)", accent: "rgba(200,121,61,0.09)", graphicOpacity: 0.085 },
  presales: { top: "rgba(63,36,100,0.12)", middle: "rgba(212,175,55,0.11)", accent: "rgba(63,36,100,0.07)", graphicOpacity: 0.09 },
  admin: { top: "rgba(63,36,100,0.08)", middle: "rgba(212,175,55,0.08)", accent: "rgba(17,24,39,0.04)", graphicOpacity: 0.065 }
};

export function BrandedBackground({ variant }: BrandedBackgroundProps) {
  const pathname = usePathname();
  const resolvedVariant = variant ?? variantFromPathname(pathname);
  const tone = variantTone[resolvedVariant];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: brandColors.background,
          backgroundImage: [
            `radial-gradient(circle at 84% 12%, ${tone.middle}, transparent 30%)`,
            `radial-gradient(circle at 14% 18%, ${tone.top}, transparent 28%)`,
            `radial-gradient(circle at 74% 86%, ${tone.accent}, transparent 34%)`,
            "linear-gradient(180deg, rgba(255,255,255,0.76), rgba(247,245,242,0.96))"
          ].join(", ")
        }}
      />
      <div
        className="absolute right-[-120px] top-16 h-[440px] w-[620px] bg-contain bg-right-top bg-no-repeat blur-[0.2px]"
        style={{
          backgroundImage: `url(${brandAssets.graphics.hotelTech})`,
          opacity: tone.graphicOpacity
        }}
      />
      <div
        className="absolute bottom-[-120px] left-[8%] h-[360px] w-[520px] bg-contain bg-left-bottom bg-no-repeat"
        style={{
          backgroundImage: `url(${brandAssets.graphics.networkPattern})`,
          opacity: tone.graphicOpacity * 0.9
        }}
      />
      <div
        className="absolute bottom-8 right-10 h-[320px] w-[320px] bg-contain bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${brandAssets.graphics.goldOrbit})`,
          opacity: tone.graphicOpacity * 0.8
        }}
      />
    </div>
  );
}

function variantFromPathname(pathname: string): BrandedBackgroundVariant {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname.startsWith("/crm")) return "crm";
  if (pathname.startsWith("/quotes") || pathname.startsWith("/products") || pathname.startsWith("/price-imports")) return "quotes";
  if (pathname.startsWith("/presales")) return "presales";
  if (pathname.startsWith("/admin") || pathname.startsWith("/settings")) return "admin";
  return "default";
}
