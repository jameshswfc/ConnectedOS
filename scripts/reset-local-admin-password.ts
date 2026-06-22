import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import { hashPassword, validatePasswordRules } from "../src/services/auth/password-service";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email) {
    throw new Error("INITIAL_ADMIN_EMAIL is required.");
  }

  if (!password) {
    throw new Error("INITIAL_ADMIN_PASSWORD is required.");
  }

  validatePasswordRules(password);

  const users = await prisma.user.findMany({
    where: {
      email: {
        equals: email,
        mode: "insensitive"
      },
      deletedAt: null
    },
    select: {
      id: true,
      email: true
    }
  });

  if (users.length === 0) {
    throw new Error("Initial admin user was not found.");
  }

  if (users.length > 1) {
    throw new Error("Multiple users matched INITIAL_ADMIN_EMAIL case-insensitively. Resolve duplicates before resetting.");
  }

  const passwordHash = await hashPassword(password);
  const previousEmail = users[0].email;

  await prisma.user.update({
    where: {
      id: users[0].id
    },
    data: {
      email,
      passwordHash,
      mustChangePassword: false,
      isActive: true,
      deactivatedAt: null
    }
  });

  console.log("User found: true");
  console.log("Password hash updated: true");
  console.log(`Email updated: ${previousEmail !== email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Admin password reset failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
