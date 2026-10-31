import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { prisma } from "../src/lib/prisma";
import { importMicrosoftDirectory } from "../src/services/auth/microsoft-directory-import-service";

async function main() {
  const { values } = parseArgs({ options: {
    file: { type: "string" }, "admin-id": { type: "string" }, apply: { type: "boolean", default: false }
  } });
  if (!values.file || !values["admin-id"]) throw new Error("Usage: npm run import:microsoft-users -- --file /private/path/directory.json --admin-id <administrator-id> [--apply]");
  const snapshot: unknown = JSON.parse(await readFile(values.file, "utf8"));
  const plan = await importMicrosoftDirectory(values["admin-id"], snapshot, values.apply);
  console.table(plan.map(({ email, action, reason }) => ({ email, action, reason: reason || "" })));
  console.log(values.apply ? "Import applied. Existing roles, passwords and ownership preserved." : "Preview only. No users changed; review before adding --apply.");
  console.log(JSON.stringify(plan.reduce<Record<string, number>>((counts, row) => {
    counts[row.action] = (counts[row.action] || 0) + 1;
    return counts;
  }, {})));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Microsoft directory import failed.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
