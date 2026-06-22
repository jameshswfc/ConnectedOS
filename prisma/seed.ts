import { PrismaClient } from "@prisma/client";
import { syncActiveUsersToResources } from "../src/modules/field-services/field-services-service";
import { presalesEngineerSeedRole, presalesEngineerSeedUsers } from "../src/modules/presales/presales-engineer-seed";
import { hashPassword } from "../src/services/auth/password-service";
import { resolveInitialAdminPassword } from "../src/services/users/initial-admin-seed";

const prisma = new PrismaClient();

const roles = [
  "Administrator",
  "Sales",
  "Pre-Sales",
  "Pre-sales Engineer",
  "Project Engineer",
  "Project Manager",
  "Field Engineer",
  "Finance",
  "Business Operations",
  "System Administrator",
  "Director",
  "Sales Manager",
  "Sales User",
  "Pre-Sales Manager",
  "Pre-Sales Engineer",
  "Engineer",
  "Finance User",
  "Customer User"
] as const;

const permissions = [
  "crm.account.read_all",
  "crm.account.read_own",
  "crm.account.create",
  "crm.account.update",
  "crm.account.delete",
  "crm.contact.read_all",
  "crm.contact.read_own",
  "crm.contact.create",
  "crm.contact.update",
  "crm.contact.delete",
  "crm.lead.read_all",
  "crm.lead.read_own",
  "crm.lead.create",
  "crm.lead.update",
  "crm.lead.delete",
  "crm.opportunity.read_all",
  "crm.opportunity.read_own",
  "crm.opportunity.create",
  "crm.opportunity.update",
  "crm.opportunity.delete",
  "crm.activity.read_all",
  "crm.activity.read_own",
  "crm.activity.create",
  "crm.activity.update",
  "crm.activity.complete",
  "crm.dashboard.read",
  "quotes.read_all",
  "quotes.read_own",
  "quotes.create",
  "quotes.update",
  "quotes.delete",
  "quotes.approve",
  "quotes.approve_own",
  "quotes.export",
  "presales.read_all",
  "presales.read_assigned",
  "presales.create",
  "presales.assign",
  "presales.update",
  "presales.complete",
  "presales.delete",
  "projects.read_all",
  "projects.read_assigned",
  "projects.create",
  "projects.update",
  "projects.delete",
  "projects.budget_view",
  "projects.budget_update",
  "projects.manage_tasks",
  "projects.manage_resources",
  "projects.manage_budget",
  "projects.export",
  "projects.forms",
  "projects.close",
  "field_services.access",
  "field_services.read_all",
  "field_services.read_own",
  "field_services.manage_resources",
  "field_services.manage_bookings",
  "field_services.override_conflict",
  "project_management.access",
  "schedule.read_all",
  "schedule.read_own",
  "schedule.create_booking",
  "schedule.override_conflict",
  "leave.request",
  "leave.approve",
  "leave.view_team",
  "expenses.create",
  "expenses.submit",
  "expenses.approve",
  "expenses.view_all",
  "expenses.export",
  "expenses.pay",
  "procurement.read_all",
  "procurement.create",
  "procurement.approve",
  "procurement.receive",
  "procurement.finance",
  "finance.read_all",
  "finance.create_invoice",
  "finance.manage_billing",
  "finance.record_payment",
  "reports.resources",
  "reports.procurement",
  "reports.helpdesk",
  "reports.sales",
  "reports.projects",
  "reports.finance",
  "reports.executive",
  "assets.read_all",
  "assets.read_assigned",
  "assets.create",
  "assets.update",
  "helpdesk.read_all",
  "helpdesk.read_assigned",
  "helpdesk.create",
  "helpdesk.update",
  "helpdesk.manage_knowledge",
  "admin.users",
  "admin.roles",
  "admin.settings",
  "admin.integrations",
  "notifications.read",
  "notifications.create",
  "documents.read_metadata",
  "documents.create_metadata",
  "audit.read"
] as const;

const rolePermissionMap: Record<string, string[]> = {
  Administrator: permissions.slice(),
  Sales: [
    "crm.account.read_all",
    "crm.account.create",
    "crm.account.update",
    "crm.contact.read_all",
    "crm.contact.create",
    "crm.contact.update",
    "crm.lead.read_own",
    "crm.lead.create",
    "crm.lead.update",
    "crm.opportunity.read_own",
    "crm.opportunity.create",
    "crm.opportunity.update",
    "crm.activity.read_own",
    "crm.activity.create",
    "crm.activity.update",
    "crm.activity.complete",
    "crm.dashboard.read",
    "quotes.read_all",
    "quotes.read_own",
    "quotes.create",
    "quotes.update",
    "quotes.export",
    "projects.read_assigned",
    "presales.read_all",
    "presales.create",
    "helpdesk.read_assigned",
    "reports.sales",
    "notifications.read",
    "documents.read_metadata"
  ],
  "Pre-Sales": [
    "crm.account.read_all",
    "crm.contact.read_all",
    "crm.lead.read_all",
    "crm.opportunity.read_all",
    "crm.activity.read_all",
    "crm.activity.create",
    "crm.activity.update",
    "crm.activity.complete",
    "quotes.read_all",
    "projects.read_assigned",
    "presales.read_all",
    "presales.create",
    "presales.update",
    "presales.complete",
    "helpdesk.read_assigned",
    "notifications.read",
    "documents.read_metadata",
    "documents.create_metadata"
  ],
  "Pre-sales Engineer": ["presales.read_all", "presales.update", "presales.complete", "notifications.read", "documents.read_metadata"],
  "Project Engineer": ["projects.read_assigned", "projects.update", "projects.manage_tasks", "projects.forms", "projects.export", "presales.read_assigned", "presales.update", "presales.complete", "field_services.access", "field_services.read_own", "project_management.access", "schedule.read_own", "leave.request", "expenses.create", "expenses.submit", "helpdesk.read_assigned", "helpdesk.update", "documents.read_metadata", "notifications.read"],
  "Project Manager": ["projects.read_assigned", "projects.create", "projects.update", "projects.manage_tasks", "projects.manage_resources", "projects.forms", "projects.export", "projects.close", "projects.budget_view", "field_services.access", "field_services.read_all", "field_services.manage_resources", "field_services.manage_bookings", "project_management.access", "schedule.read_all", "schedule.create_booking", "leave.view_team", "procurement.read_all", "procurement.create", "procurement.receive", "helpdesk.read_assigned", "helpdesk.update", "reports.projects", "documents.read_metadata", "notifications.read"],
  "Field Engineer": ["projects.read_assigned", "projects.forms", "field_services.access", "field_services.read_own", "schedule.read_own", "leave.request", "expenses.create", "expenses.submit", "helpdesk.read_assigned", "helpdesk.update", "documents.read_metadata", "notifications.read"],
  Finance: [
    "finance.read_all",
    "finance.create_invoice",
    "finance.manage_billing",
    "finance.record_payment",
    "expenses.approve",
    "expenses.view_all",
    "expenses.export",
    "expenses.pay",
    "procurement.read_all",
    "procurement.finance",
    "reports.finance",
    "notifications.read",
    "documents.read_metadata"
  ],
  "Business Operations": [
    "crm.account.read_all",
    "crm.account.create",
    "crm.account.update",
    "crm.contact.read_all",
    "crm.contact.create",
    "crm.contact.update",
    "crm.lead.read_all",
    "crm.lead.create",
    "crm.lead.update",
    "crm.opportunity.read_all",
    "crm.opportunity.create",
    "crm.opportunity.update",
    "crm.activity.read_all",
    "crm.activity.create",
    "crm.activity.update",
    "crm.activity.complete",
    "crm.dashboard.read",
    "quotes.read_all",
    "quotes.read_own",
    "quotes.create",
    "quotes.update",
    "quotes.export",
    "presales.read_all",
    "presales.create",
    "presales.assign",
    "presales.update",
    "presales.complete",
    "projects.read_all",
    "projects.create",
    "projects.update",
    "projects.manage_tasks",
    "projects.manage_resources",
    "projects.manage_budget",
    "projects.export",
    "projects.forms",
    "projects.close",
    "field_services.access",
    "field_services.read_all",
    "field_services.manage_resources",
    "field_services.manage_bookings",
    "field_services.override_conflict",
    "project_management.access",
    "schedule.read_all",
    "schedule.create_booking",
    "schedule.override_conflict",
    "leave.request",
    "leave.approve",
    "leave.view_team",
    "expenses.create",
    "expenses.submit",
    "expenses.approve",
    "expenses.view_all",
    "expenses.export",
    "expenses.pay",
    "procurement.read_all",
    "procurement.create",
    "procurement.approve",
    "procurement.receive",
    "procurement.finance",
    "finance.read_all",
    "finance.create_invoice",
    "finance.manage_billing",
    "finance.record_payment",
    "reports.sales",
    "reports.projects",
    "reports.resources",
    "reports.finance",
    "reports.procurement",
    "reports.helpdesk",
    "reports.executive",
    "assets.read_all",
    "assets.create",
    "assets.update",
    "helpdesk.read_all",
    "helpdesk.create",
    "helpdesk.update",
    "helpdesk.manage_knowledge",
    "audit.read",
    "notifications.read",
    "documents.read_metadata",
    "documents.create_metadata"
  ],
  "System Administrator": permissions.filter((permission) => !permission.startsWith("admin.")),
  Director: permissions.filter((permission) => !permission.startsWith("admin.")),
  "Sales Manager": permissions.filter((permission) => permission.startsWith("crm.") || (permission.startsWith("quotes.") && permission !== "quotes.approve_own") || ["presales.read_all", "presales.create", "presales.assign", "presales.update", "presales.complete"].includes(permission)),
  "Sales User": [
    "crm.account.read_own",
    "crm.account.create",
    "crm.account.update",
    "crm.contact.read_own",
    "crm.contact.create",
    "crm.contact.update",
    "crm.lead.read_own",
    "crm.lead.create",
    "crm.lead.update",
    "crm.opportunity.read_own",
    "crm.opportunity.create",
    "crm.opportunity.update",
    "crm.activity.read_own",
    "crm.activity.create",
    "crm.activity.update",
    "crm.activity.complete",
    "crm.dashboard.read",
    "quotes.read_own",
    "quotes.create",
    "quotes.update",
    "presales.read_assigned",
    "presales.create",
    "notifications.read"
  ],
  "Pre-Sales Manager": permissions.filter((permission) => permission.startsWith("presales.")),
  "Pre-Sales Engineer": ["presales.read_assigned", "presales.update", "presales.complete", "notifications.read"],
  Engineer: ["projects.read_assigned", "schedule.read_own", "documents.read_metadata", "notifications.read"],
  "Finance User": permissions.filter((permission) => permission.startsWith("expenses.") || permission.startsWith("finance.") || permission.startsWith("procurement.") || permission.startsWith("reports.finance") || permission === "quotes.read_all"),
  "Customer User": ["notifications.read", "documents.read_metadata"]
};

function describePermission(code: string) {
  return code
    .split(".")
    .map((part) => part.replaceAll("_", " "))
    .join(" ");
}

async function main() {
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      create: {
        name: roleName,
        description: `${roleName} seeded role`
      },
      update: {}
    });
  }

  for (const code of permissions) {
    const [module, ...actionParts] = code.split(".");
    await prisma.permission.upsert({
      where: { code },
      create: {
        code,
        module,
        action: actionParts.join("."),
        description: describePermission(code)
      },
      update: {
        module,
        action: actionParts.join("."),
        description: describePermission(code)
      }
    });
  }

  for (const [roleName, permissionCodes] of Object.entries(rolePermissionMap)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    const permissionsForRole = await prisma.permission.findMany({
      where: {
        code: {
          in: permissionCodes
        }
      },
      select: {
        id: true
      }
    });
    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permissionId: {
          notIn: permissionsForRole.map((permission) => permission.id)
        }
      }
    });
    for (const code of permissionCodes) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code } });
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        create: {
          roleId: role.id,
          permissionId: permission.id
        },
        update: {}
      });
    }
  }

  const presalesEngineerRole = await prisma.role.findUniqueOrThrow({ where: { name: presalesEngineerSeedRole } });
  for (const engineer of presalesEngineerSeedUsers) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: engineer.email },
          { displayName: engineer.displayName }
        ]
      }
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          roleId: presalesEngineerRole.id,
          isActive: true,
          userType: "internal"
        }
      });
      continue;
    }

    await prisma.user.create({
      data: {
        email: engineer.email,
        displayName: engineer.displayName,
        jobTitle: engineer.isDevelopmentPlaceholder ? "Pre-Sales Engineer (development placeholder)" : "Pre-Sales Engineer",
        roleId: presalesEngineerRole.id,
        userType: "internal",
        isActive: true
      }
    });
  }

  const quoteApprovalRules = [
    { ruleType: "low_margin", thresholdValue: 25, requiredPermission: "quotes.approve", isActive: true },
    { ruleType: "high_value", thresholdValue: 50000, requiredPermission: "quotes.approve", isActive: true },
    { ruleType: "manual_override", thresholdValue: null, requiredPermission: "quotes.approve", isActive: true }
  ] as const;

  for (const rule of quoteApprovalRules) {
    await prisma.quoteApprovalRule.upsert({
      where: { ruleType: rule.ruleType },
      create: rule,
      update: {
        thresholdValue: rule.thresholdValue,
        requiredPermission: rule.requiredPermission,
        isActive: rule.isActive
      }
    });
  }

  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  if (initialAdminEmail) {
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "Administrator" } });
    const existingAdmin = await prisma.user.findUnique({ where: { email: initialAdminEmail } });
    const passwordDecision = resolveInitialAdminPassword({
      existingPasswordHash: existingAdmin?.passwordHash,
      envPassword: process.env.INITIAL_ADMIN_PASSWORD
    });
    const adminPasswordHash = passwordDecision.password ? await hashPassword(passwordDecision.password) : undefined;
    const adminUser = existingAdmin
      ? await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          roleId: adminRole.id,
          permissionLevel: "administrator",
          isActive: true,
          ...(adminPasswordHash ? { passwordHash: adminPasswordHash, mustChangePassword: passwordDecision.mustChangePassword } : {})
        }
      })
      : await prisma.user.create({
        data: {
        email: initialAdminEmail,
        displayName: process.env.INITIAL_ADMIN_NAME || "ConnectedOS Administrator",
        passwordHash: adminPasswordHash,
        roleId: adminRole.id,
        permissionLevel: "administrator",
        userType: "internal",
        isActive: true,
        mustChangePassword: passwordDecision.mustChangePassword
        }
      });

    const lostReasons = ["Price", "No Decision", "Competitor", "Timing", "Budget"];
    for (const name of lostReasons) {
      await prisma.lostReason.upsert({
        where: { name },
        create: { name },
        update: { isActive: true }
      });
    }

    const existingDemoAccount = await prisma.account.findFirst({
      where: {
        name: "Connected Hospitality Demo Account",
        deletedAt: null
      }
    });

    if (!existingDemoAccount) {
      const account = await prisma.account.create({
        data: {
          name: "Connected Hospitality Demo Account",
          accountType: "prospect",
          status: "prospect",
          website: "https://connectedhospitality.example",
          phone: "020 0000 0000",
          city: "London",
          country: "United Kingdom",
          industry: "Hospitality Technology",
          ownerId: adminUser.id,
          createdById: adminUser.id,
          updatedById: adminUser.id,
          notes: "Seeded CRM account for Sprint 2 browser testing."
        }
      });

      const contact = await prisma.contact.create({
        data: {
          accountId: account.id,
          firstName: "Alex",
          lastName: "Morgan",
          jobTitle: "Operations Director",
          email: "alex.morgan@example.com",
          phone: "020 0000 0001",
          isPrimary: true,
          relationshipStrength: "secured",
          status: "active",
          createdById: adminUser.id,
          updatedById: adminUser.id
        }
      });

      const opportunity = await prisma.opportunity.create({
        data: {
          accountId: account.id,
          primaryContactId: contact.id,
          ownerId: adminUser.id,
          opportunityName: "Guest Wi-Fi Refresh",
          opportunityType: "guest_wifi",
          stage: "pre_sales_solution_design",
          status: "open",
          value: "50000.00",
          marginPercent: "28.00",
          probabilityPercent: 20,
          weightedValue: "10000.00",
          expectedCloseDate: new Date("2026-07-31"),
          source: "other",
          nextActionDate: new Date("2026-06-14"),
          createdById: adminUser.id,
          updatedById: adminUser.id,
          notes: "Seeded opportunity for Sprint 2 CRM core testing."
        }
      });

      await prisma.lead.create({
        data: {
          accountName: "Harbour Hotel Group",
          contactName: "Sam Taylor",
          email: "sam.taylor@example.com",
          phone: "020 0000 0002",
          source: "Referral",
          status: "new",
          estimatedValue: "15000.00",
          ownerId: adminUser.id,
          nextActionDate: new Date("2026-06-12"),
          createdById: adminUser.id,
          updatedById: adminUser.id
        }
      });

      await prisma.salesActivity.create({
        data: {
          accountId: account.id,
          contactId: contact.id,
          opportunityId: opportunity.id,
          ownerId: adminUser.id,
          activityType: "call",
          subject: "Discovery call",
          description: "Discuss requirements and current estate.",
          dueDate: new Date("2026-06-10T10:00:00.000Z"),
          createdById: adminUser.id,
          updatedById: adminUser.id
        }
      });
    }
  }

  await syncActiveUsersToResources();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
