import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Run this check only against a local database.");
  const schema = `roles_check_${randomUUID().replaceAll("-", "")}`;
  const adminDb = new PrismaClient();
  let created = false;
  let disconnect: (() => Promise<void>) | undefined;
  try {
    await adminDb.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    created = true;
    url.searchParams.set("schema", schema);
    process.env.DATABASE_URL = url.toString();
    process.env.EMAIL_PROVIDER = "disabled";
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], { env: process.env, stdio: "pipe" });
    const { prisma } = await import("../src/lib/prisma");
    disconnect = () => prisma.$disconnect();
    const { updateUser, archiveUser, listUsers, listActiveUsersByRole } = await import("../src/services/users/user-service");
    const { getUserPermissions } = await import("../src/services/permissions/permission-service");
    const { getActiveSalesUsers } = await import("../src/modules/crm/sales/salesperson-service");
    const roles = await Promise.all(["Administrator", "Sales", "Project Manager", "Staff"].map((name) => prisma.role.create({ data: { name } })));
    const [adminRole, salesRole, pmRole, staffRole] = roles;
    for (const [code, roleId] of [["admin.users", adminRole.id], ["crm.account.read_all", salesRole.id], ["projects.manage_tasks", pmRole.id]]) {
      await prisma.permission.create({ data: { code, module: code.split(".")[0], action: code.split(".").at(-1)!, description: code, rolePermissions: { create: { roleId } } } });
    }
    const admin = await prisma.user.create({ data: { roleId: adminRole.id, displayName: "Test administrator", email: "admin@example.invalid", permissionLevel: "administrator" } });
    const member = await prisma.user.create({ data: { roleId: pmRole.id, displayName: "Test member", email: "member@example.invalid", microsoftId: "test:immutable-member" } });
    await updateUser(admin.id, member.id, { roleId: pmRole.id, additionalRoleIds: [salesRole.id, salesRole.id], permissionLevel: "user" });
    assert.equal(await prisma.userRole.count({ where: { userId: member.id } }), 1);
    assert.deepEqual((await getUserPermissions(member.id)).sort(), ["crm.account.read_all", "projects.manage_tasks"].sort());
    assert.ok((await getActiveSalesUsers()).some((user) => user.id === member.id));
    assert.ok((await listActiveUsersByRole("Sales")).some((user) => user.id === member.id));
    await assert.rejects(() => updateUser(member.id, admin.id, { permissionLevel: "administrator" }), /Missing permission/);
    await assert.rejects(() => updateUser(admin.id, member.id, { additionalRoleIds: [adminRole.id] }), /primary role/);
    await assert.rejects(() => updateUser(admin.id, member.id, { roleId: staffRole.id }), /Replace Staff/);
    assert.equal(await prisma.userRole.count({ where: { userId: member.id } }), 1);
    await assert.rejects(() => archiveUser(admin.id, member.id), /Deactivate/);
    await updateUser(admin.id, member.id, { isActive: false });
    await archiveUser(admin.id, member.id);
    await archiveUser(admin.id, member.id);
    assert.ok(!(await listUsers(true)).some((user) => user.id === member.id));
    assert.deepEqual(await getUserPermissions(member.id), []);
    const retained = await prisma.user.findUniqueOrThrow({ where: { id: member.id } });
    assert.equal(retained.microsoftId, "test:immutable-member");
    assert.equal(await prisma.auditLog.count({ where: { entityId: member.id, action: "archive_user" } }), 1);
    console.log("PASS: multi-role persistence, permission union, selectors, admin isolation, transactional validation, archive idempotency, hidden users and retained identity/audit history.");
  } finally {
    await disconnect?.();
    if (created) await adminDb.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await adminDb.$disconnect();
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Role check failed"); process.exitCode = 1; });
