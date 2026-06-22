import { Bell, BriefcaseBusiness, Building2, CalendarRange, ClipboardCheck, Columns3, Contact, FileSpreadsheet, LayoutDashboard, LifeBuoy, ListTodo, Package, ReceiptText, Settings, Shield, ShoppingCart, Target, UserRoundPlus, Users, Wallet } from "lucide-react";

export type NavigationItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permissions?: string[];
  matchAnyPrefix?: string[];
  roles?: string[];
  alwaysVisible?: boolean;
};

export const approvedRoleNames = ["Administrator", "Sales", "Pre-Sales", "Project Engineer", "Project Manager", "Field Engineer", "Finance", "Business Operations"] as const;

export const navigationItems: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Administrator"] },
  { href: "/crm/accounts", label: "Accounts", icon: Building2, roles: ["Administrator", "Sales", "Pre-Sales", "Business Operations"], permissions: ["crm.account.read_all", "crm.account.read_own", "crm.account.create", "crm.account.update"] },
  { href: "/crm/contacts", label: "Contacts", icon: Contact, roles: ["Administrator", "Sales", "Pre-Sales", "Business Operations"], permissions: ["crm.contact.read_all", "crm.contact.read_own", "crm.contact.create", "crm.contact.update"] },
  { href: "/crm/leads", label: "Leads", icon: UserRoundPlus, roles: ["Administrator", "Sales", "Pre-Sales", "Business Operations"], permissions: ["crm.lead.read_all", "crm.lead.read_own", "crm.lead.create", "crm.lead.update"] },
  { href: "/crm/opportunities", label: "Opportunities", icon: Target, roles: ["Administrator", "Sales", "Pre-Sales", "Business Operations"], permissions: ["crm.opportunity.read_all", "crm.opportunity.read_own", "crm.opportunity.create", "crm.opportunity.update"] },
  { href: "/crm/my-work", label: "My Work", icon: BriefcaseBusiness, roles: ["Administrator", "Sales", "Business Operations"], permissions: ["crm.lead.read_own", "crm.opportunity.read_own", "crm.activity.read_own"] },
  { href: "/crm/pipeline", label: "CRM Pipeline", icon: Columns3, roles: ["Administrator", "Sales", "Business Operations"], permissions: ["crm.opportunity.read_all", "crm.opportunity.read_own"] },
  { href: "/crm/forecast", label: "CRM Forecast", icon: CalendarRange, roles: ["Administrator", "Sales", "Business Operations"], permissions: ["crm.opportunity.read_all", "crm.opportunity.read_own"] },
  { href: "/crm/activities", label: "Activities", icon: ListTodo, roles: ["Administrator", "Sales", "Pre-Sales", "Business Operations"], permissions: ["crm.activity.read_all", "crm.activity.read_own", "crm.activity.create", "crm.activity.update"] },
  { href: "/presales", label: "Pre-Sales", icon: ClipboardCheck, roles: ["Administrator", "Sales", "Pre-Sales", "Project Engineer", "Business Operations"], permissions: ["presales.read_all", "presales.read_assigned", "presales.create", "presales.update"] },
  { href: "/quotes", label: "Quotes", icon: ReceiptText, roles: ["Administrator", "Sales", "Pre-Sales", "Business Operations"], permissions: ["quotes.read_all", "quotes.read_own", "quotes.create", "quotes.update"] },
  { href: "/products", label: "Products", icon: Package, roles: ["Administrator", "Business Operations"], permissions: ["quotes.read_all", "quotes.create", "quotes.update"] },
  { href: "/price-imports", label: "Price Imports", icon: FileSpreadsheet, roles: ["Administrator", "Business Operations"], permissions: ["quotes.create", "quotes.update"] },
  { href: "/projects", label: "Projects", icon: ClipboardCheck, roles: ["Administrator", "Sales", "Pre-Sales", "Project Engineer", "Project Manager", "Field Engineer", "Business Operations"], permissions: ["projects.read_all", "projects.read_assigned", "projects.create", "projects.update"] },
  { href: "/field-services", label: "Field Services", icon: Package, roles: ["Administrator", "Project Engineer", "Project Manager", "Field Engineer", "Business Operations"], permissions: ["field_services.access", "field_services.read_all", "field_services.read_own"] },
  { href: "/leave", label: "Leave", icon: CalendarRange, roles: ["Administrator", "Project Engineer", "Project Manager", "Field Engineer", "Finance", "Business Operations"], permissions: ["leave.request", "leave.approve", "leave.view_team"] },
  { href: "/expenses", label: "Expenses", icon: Wallet, roles: ["Administrator", "Project Engineer", "Field Engineer", "Finance", "Business Operations"], permissions: ["expenses.create", "expenses.submit", "expenses.approve", "expenses.view_all"] },
  { href: "/procurement", label: "Procurement", icon: ShoppingCart, roles: ["Administrator", "Project Manager", "Finance", "Business Operations"], permissions: ["procurement.read_all", "procurement.create", "procurement.approve"] },
  { href: "/finance", label: "Finance", icon: Wallet, roles: ["Administrator", "Finance", "Business Operations"], permissions: ["finance.read_all", "finance.create_invoice", "finance.manage_billing"] },
  { href: "/reports", label: "Reports", icon: FileSpreadsheet, roles: ["Administrator", "Sales", "Project Manager", "Finance", "Business Operations"], permissions: ["reports.sales", "reports.projects", "reports.resources", "reports.finance", "reports.procurement", "reports.helpdesk", "reports.executive"] },
  { href: "/assets", label: "Assets", icon: Package, roles: ["Administrator", "Project Manager", "Finance", "Business Operations"], permissions: ["assets.read_all", "assets.read_assigned", "assets.create", "assets.update"] },
  { href: "/helpdesk", label: "Helpdesk", icon: LifeBuoy, roles: ["Administrator", "Sales", "Pre-Sales", "Project Engineer", "Project Manager", "Field Engineer", "Finance", "Business Operations"], permissions: ["helpdesk.read_all", "helpdesk.read_assigned", "helpdesk.create", "helpdesk.update"] },
  { href: "/admin/audit", label: "Audit", icon: Shield, roles: ["Administrator", "Business Operations"], permissions: ["audit.read"] },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["Administrator"], permissions: ["admin.users"] },
  { href: "/admin/roles", label: "Roles", icon: Shield, roles: ["Administrator"], permissions: ["admin.roles"] },
  { href: "/admin/permissions", label: "Permissions", icon: Shield, roles: ["Administrator"], permissions: ["admin.roles"] },
  { href: "/notifications", label: "Notifications", icon: Bell, roles: [...approvedRoleNames], permissions: ["notifications.read"] },
  { href: "/settings", label: "Settings", icon: Settings, alwaysVisible: true }
];

export function visibleNavigationItems(userPermissions: string[] = [], permissionLevel?: string | null, roleName?: string | null) {
  return navigationItems.filter((item) => canViewNavigationItem(item, userPermissions, permissionLevel, roleName));
}

export function canViewNavigationItem(item: NavigationItem, userPermissions: string[] = [], permissionLevel?: string | null, roleName?: string | null) {
  if (item.alwaysVisible || permissionLevel === "administrator" || userPermissions.includes("admin.users")) {
    return true;
  }

  if (roleName && item.roles?.includes(roleName)) {
    return true;
  }

  if (item.permissions?.some((permission) => userPermissions.includes(permission))) {
    return true;
  }

  return Boolean(item.matchAnyPrefix?.some((prefix) => userPermissions.some((permission) => permission.startsWith(prefix))));
}

export function canAccessNavigationPath(path: string, userPermissions: string[] = [], permissionLevel?: string | null, roleName?: string | null) {
  const item = navigationItems.find((navigationItem) => navigationItem.href === path);
  return item ? canViewNavigationItem(item, userPermissions, permissionLevel, roleName) : false;
}
