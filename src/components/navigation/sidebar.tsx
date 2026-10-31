"use client";

import Image from "next/image";
import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { brandAssets, brandCopy } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { visibleNavigationItems } from "@/components/navigation/navigation-items";
import { groupNavigationItems, navigationItemActive } from "@/components/navigation/navigation-groups";
import { Menu } from "lucide-react";

export function Sidebar({ userPermissions = [], permissionLevel, roleName }: { userPermissions?: string[]; permissionLevel?: string | null; roleName?: string | string[] | null }) {
  const pathname = usePathname();
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  const navigationItems = visibleNavigationItems(userPermissions, permissionLevel, roleName);
  const groups = groupNavigationItems(navigationItems, pathname);
  const renderLink = (item: (typeof navigationItems)[number]) => {
    const Icon = item.icon;
    const active = navigationItemActive(pathname, item.href);
    return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
      className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500", active && "bg-white text-brand-900 hover:bg-white")}>
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-gold-700")} aria-hidden="true" />{item.label}
    </Link>;
  };
  const navigation = <nav aria-label="Main navigation" className="space-y-2 px-3 py-4">
    {groups.map((group) => group.items.length === 1 ? renderLink(group.items[0]) : (
      <details key={`${group.label}-${pathname}`} open={group.active || group.label === "My Work"} className="border-b border-white/10 pb-2">
        <summary className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-gold-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500">{group.label}</summary>
        <div className="mt-1 space-y-1">{group.items.map(renderLink)}</div>
      </details>
    ))}
  </nav>;

  return (
    <>
    <details ref={mobileMenu} onKeyDown={(event) => { if (event.key === "Escape") mobileMenu.current?.removeAttribute("open"); }} className="fixed bottom-4 left-4 z-40 rounded-lg bg-brand-900 text-white shadow-lg lg:hidden">
      <summary aria-label="Navigation menu" className="flex cursor-pointer list-none items-center gap-2 rounded-lg p-3 focus-visible:ring-2 focus-visible:ring-gold-500"><Menu className="h-5 w-5" aria-hidden="true" />Menu</summary>
      <div className="max-h-[65vh] w-64 max-w-[85vw] overflow-y-auto" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) mobileMenu.current?.removeAttribute("open"); }}>{navigation}</div>
    </details>
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-brand-900 bg-brand-900 text-white lg:block">
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
      {navigation}
    </aside>
    </>
  );
}
