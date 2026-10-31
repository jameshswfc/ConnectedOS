import type { NavigationItem } from "./navigation-items";

const groups = [
  { label: "My Work", paths: ["/dashboard", "/crm/my-work", "/leave", "/expenses", "/notifications", "/settings"] },
  { label: "Sales", paths: ["/crm/pipeline", "/crm/leads", "/crm/opportunities", "/quotes", "/crm/accounts", "/crm/contacts", "/crm/activities", "/crm/forecast"] },
  { label: "Pre-Sales", paths: ["/presales"] },
  { label: "Projects", paths: ["/projects"] },
  { label: "Scheduling", paths: ["/field-services"] },
  { label: "Business Tools", paths: ["/products", "/price-imports", "/procurement", "/assets", "/finance", "/helpdesk", "/reports", "/admin/audit"] },
  { label: "Administration", paths: ["/admin/users", "/admin/roles", "/admin/permissions"] }
];

export function navigationItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Group only the already-authorised links. Grouping never grants access.
export function groupNavigationItems(items: NavigationItem[], pathname: string) {
  return groups.map((group) => {
    const links = group.paths.flatMap((path) => items.filter((item) => item.href === path));
    return { label: group.label, items: links, active: links.some((item) => navigationItemActive(pathname, item.href)) };
  }).filter((group) => group.items.length > 0);
}
