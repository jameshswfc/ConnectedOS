import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import { verifyPassword } from "../src/services/auth/password-service";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const testPassword = process.argv[3] ?? process.env.INITIAL_ADMIN_PASSWORD;

  if (!email) {
    throw new Error("Usage: npm run debug:user-password -- email@example.com [test-password]");
  }

  if (!testPassword) {
    throw new Error("Provide a test password as the second argument or set INITIAL_ADMIN_PASSWORD.");
  }

  const users = await prisma.user.findMany({
    where: {
      email: {
        equals: email,
        mode: "insensitive"
      }
    },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      isActive: true,
      deletedAt: true,
      deactivatedAt: true
    }
  });

  console.log(`Submitted email: ${email}`);
  console.log(`Matching users found: ${users.length}`);

  for (const user of users) {
    const hashPresent = Boolean(user.passwordHash);
    const passwordMatches = hashPresent ? await verifyPassword(testPassword, user.passwordHash) : false;

    console.log(`User ID found: ${user.id}`);
    console.log(`Stored email found: ${user.email}`);
    console.log(`Hash present: ${hashPresent}`);
    console.log(`Bcrypt comparison result: ${passwordMatches}`);
    console.log(`Active: ${user.isActive}`);
    console.log(`Deleted: ${Boolean(user.deletedAt)}`);
    console.log(`Deactivated: ${Boolean(user.deactivatedAt)}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "User password debug failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
