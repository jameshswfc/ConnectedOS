import { prisma } from "@/lib/prisma";
import { exchangeSageToken, sageTokensSchema, type SageTokens } from "./sage-client";
import { openSageSecret, sageConfig, sealSageSecret } from "./sage-security";

// Serialises reads and writes against the same rotating refresh token.
export async function withSageSession<T>(run: (tokens: SageTokens, businessId: string) => Promise<T>) {
  const config = sageConfig();
  const lease = new Date(Date.now() + 300000);
  const acquired = await prisma.sageConnection.updateMany({ where: { id: "sage-accounting", businessId: config.businessId, OR: [{ syncLeaseUntil: null }, { syncLeaseUntil: { lt: new Date() } }] }, data: { syncLeaseUntil: lease } });
  if (acquired.count !== 1) throw new Error("Unable to use Sage. Connect the account first or wait for the current operation to finish.");
  try {
    const connection = await prisma.sageConnection.findUniqueOrThrow({ where: { id: "sage-accounting" } });
    let tokens = sageTokensSchema.parse(openSageSecret(connection.encryptedTokens));
    if (tokens.expiresAt < Date.now() + 30000) {
      tokens = await exchangeSageToken({ grant_type: "refresh_token", refresh_token: tokens.refresh_token });
      await prisma.sageConnection.update({ where: { id: connection.id }, data: { encryptedTokens: sealSageSecret(tokens) } });
    }
    return await run(tokens, connection.businessId);
  } finally {
    await prisma.sageConnection.updateMany({ where: { id: "sage-accounting", syncLeaseUntil: lease }, data: { syncLeaseUntil: null } });
  }
}
