async function main() {
  if (process.env.DATABASE_URL?.includes("localhost")) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace("localhost", "127.0.0.1");
  }
  const { PrismaClient } = await import("@prisma/client");
  const { seedProductionTestData } = await import("@/modules/testing/production-test-seed");
  const prisma = new PrismaClient();
  try {
    const summary = await seedProductionTestData(prisma);
    console.log("Production test seed complete");
    console.table(summary);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Production test seed failed", error instanceof Error ? error.message : error);
  process.exit(1);
});

export {};
