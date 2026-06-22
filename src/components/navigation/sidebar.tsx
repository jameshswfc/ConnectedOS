"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { brandAssets, brandCopy } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { visibleNavigationItems } from "@/components/navigation/navigation-items";

export function Sidebar({ userPermissions = [], permissionLevel, roleName }: { userPermissions?: string[]; permissionLevel?: string | null; roleName?: string | null }) {
  const pathname = usePathname();
  const navigationItems = visibleNavigationItems(userPermissions, permissionLevel, roleName);

  return (
    <aside className="hidden min-h-screen w-64 border-r border-brand-900 bg-brand-900 text-white lg:block">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white p-1.5">
            <Image src={brandAssets.logo} alt="Connected Hospitality" width={44} height={44} className="h-full w-full object-contain" priority />
          </div>
          <div>
            <div className="text-base font-semibold text-white">{brandCopy.platformName}</div>
            <div className="mt-0.5 text-xs text-gold-100">{brandCopy.companyName}</div>
          </div>
        </div>
        <div className="mt-4 h-1 w-20 rounded-full bg-gold-500" />
      </div>
      <nav className="space-y-1 px-3 py-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/crm" && item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500",
                active && "bg-white text-brand-900 shadow-sm hover:bg-white hover:text-brand-900"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-4 w-4", active && "text-gold-700")} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
