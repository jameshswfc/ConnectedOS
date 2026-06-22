import { describe, expect, it } from "vitest";
import { visibleNavigationItems } from "@/components/navigation/navigation-items";

describe("navigation visibility", () => {
  it("shows every navigation item to administrators", () => {
    expect(labelsFor("Administrator", "administrator")).toEqual([
      "Dashboard",
      "Accounts",
      "Contacts",
      "Leads",
      "Opportunities",
      "My Work",
      "CRM Pipeline",
      "CRM Forecast",
      "Activities",
      "Pre-Sales",
      "Quotes",
      "Products",
      "Price Imports",
      "Projects",
      "Field Services",
      "Leave",
      "Expenses",
      "Procurement",
      "Finance",
      "Reports",
      "Assets",
      "Helpdesk",
      "Audit",
      "Users",
      "Roles",
      "Permissions",
      "Notifications",
      "Settings"
    ]);
  });

  it("shows only Sales-approved navigation items to Sales users", () => {
    expect(labelsFor("Sales")).toEqual([
      "Accounts",
      "Contacts",
      "Leads",
      "Opportunities",
      "My Work",
      "CRM Pipeline",
      "CRM Forecast",
      "Activities",
      "Pre-Sales",
      "Quotes",
      "Projects",
      "Reports",
      "Helpdesk",
      "Notifications",
      "Settings"
    ]);
  });

  it("shows only Pre-Sales-approved navigation items to Pre-Sales users", () => {
    expect(labelsFor("Pre-Sales")).toEqual([
      "Accounts",
      "Contacts",
      "Leads",
      "Opportunities",
      "Activities",
      "Pre-Sales",
      "Quotes",
      "Projects",
      "Helpdesk",
      "Notifications",
      "Settings"
    ]);
  });

  it("shows Business Operations navigation without admin items", () => {
    expect(labelsFor("Business Operations")).toEqual([
      "Accounts",
      "Contacts",
      "Leads",
      "Opportunities",
      "My Work",
      "CRM Pipeline",
      "CRM Forecast",
      "Activities",
      "Pre-Sales",
      "Quotes",
      "Products",
      "Price Imports",
      "Projects",
      "Field Services",
      "Leave",
      "Expenses",
      "Procurement",
      "Finance",
      "Reports",
      "Assets",
      "Helpdesk",
      "Audit",
      "Notifications",
      "Settings"
    ]);
  });

  it("shows Projects, Field Services and Settings to Field Engineer users", () => {
    expect(labelsFor("Field Engineer")).toEqual(["Projects", "Field Services", "Leave", "Expenses", "Helpdesk", "Notifications", "Settings"]);
  });

  it("shows Project Engineer navigation", () => {
    expect(labelsFor("Project Engineer")).toEqual(["Pre-Sales", "Projects", "Field Services", "Leave", "Expenses", "Helpdesk", "Notifications", "Settings"]);
  });

  it("shows Project Manager navigation", () => {
    expect(labelsFor("Project Manager")).toEqual(["Projects", "Field Services", "Leave", "Procurement", "Reports", "Assets", "Helpdesk", "Notifications", "Settings"]);
  });

  it("shows finance navigation", () => {
    expect(labelsFor("Finance")).toEqual(["Leave", "Expenses", "Procurement", "Finance", "Reports", "Assets", "Helpdesk", "Notifications", "Settings"]);
  });

  it("does not show duplicate project navigation items", () => {
    const labels = labelsFor("Administrator", "administrator");
    expect(labels.filter((label) => label === "Projects")).toHaveLength(1);
    expect(labels).not.toContain("Project Management");
  });

  it("hides admin menu items from non-admin users", () => {
    for (const role of ["Sales", "Pre-Sales", "Business Operations", "Field Engineer", "Project Engineer", "Project Manager", "Finance"]) {
      const labels = labelsFor(role);
      expect(labels).not.toContain("Users");
      expect(labels).not.toContain("Roles");
      expect(labels).not.toContain("Permissions");
    }
  });
});

function labelsFor(roleName: string, permissionLevel = "user") {
  return visibleNavigationItems([], permissionLevel, roleName).map((item) => item.label);
}
