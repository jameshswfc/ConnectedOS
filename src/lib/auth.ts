import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authorizeLocalCredentials } from "@/services/auth/local-login-service";
import { permissionCodesForLevel } from "@/services/users/user-service";

type MicrosoftProfile = {
  oid?: string;
  sub?: string;
  name?: string;
  email?: string;
  preferred_username?: string;
};

const isEntraEnabled = process.env.ENABLE_ENTRA_LOGIN === "true" && Boolean(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET);

export function resolveAuthRedirect(url: string, baseUrl: string) {
  if (url.startsWith("/")) {
    return `${baseUrl}${url}`;
  }

  const targetUrl = new URL(url);
  const currentUrl = new URL(baseUrl);

  if (targetUrl.hostname === currentUrl.hostname && targetUrl.protocol === currentUrl.protocol) {
    return targetUrl.toString();
  }

  return baseUrl;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Local Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        return authorizeLocalCredentials(credentials ?? {});
      }
    }),
    ...(isEntraEnabled
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID ?? "",
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
            tenantId: process.env.AZURE_AD_TENANT_ID
          })
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60
  },
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      return resolveAuthRedirect(url, baseUrl);
    },
    async signIn({ account, profile, user }) {
      if (account?.provider === "credentials") {
        const existingUser = user.id ? await prisma.user.findUnique({ where: { id: user.id } }) : null;
        if (!existingUser || !existingUser.isActive || existingUser.deletedAt || existingUser.deactivatedAt) return false;
        await prisma.user.update({ where: { id: existingUser.id }, data: { lastLoginAt: new Date() } });
        await prisma.auditLog.create({
          data: {
            userId: existingUser.id,
            module: "auth",
            entityType: "User",
            entityId: existingUser.id,
            action: "local_login",
            newValue: { email: existingUser.email }
          }
        });
        return true;
      }

      const microsoftProfile = profile as MicrosoftProfile | undefined;
      const email = (microsoftProfile?.email ?? microsoftProfile?.preferred_username ?? "").toLowerCase();
      const microsoftId = microsoftProfile?.oid ?? microsoftProfile?.sub ?? account?.providerAccountId;

      if (!email) {
        return false;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
        include: { role: true }
      });

      if (!existingUser || !existingUser.isActive || existingUser.deletedAt) {
        return false;
      }

      if (microsoftId && existingUser.microsoftId !== microsoftId) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            microsoftId,
            displayName: microsoftProfile?.name ?? existingUser.displayName
          }
        });
      }

      await prisma.auditLog.create({
        data: {
          userId: existingUser.id,
          module: "auth",
          entityType: "User",
          entityId: existingUser.id,
          action: "login",
          newValue: {
            email
          }
        }
      });

      return true;
    },
    async jwt({ token, user }) {
      const userId = typeof user?.id === "string" ? user.id : typeof token.userId === "string" ? token.userId : undefined;
      const email = typeof token.email === "string" ? token.email.trim().toLowerCase() : undefined;
      const dbUser = await prisma.user.findFirst({
        where: userId
          ? { id: userId }
          : email
            ? { email: { equals: email, mode: "insensitive" } }
            : { id: "__missing_user__" },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      });

      if (!dbUser) {
        return token;
      }

      const allPermissions = await prisma.permission.findMany({ select: { code: true } });
      const rolePermissions = dbUser.role.rolePermissions.map((rolePermission) => rolePermission.permission.code);
      token.userId = dbUser.id;
      token.role = dbUser.role.name;
      token.permissionLevel = dbUser.permissionLevel;
      token.mustChangePassword = dbUser.mustChangePassword;
      token.permissions = permissionCodesForLevel(dbUser.permissionLevel, rolePermissions, allPermissions.map((permission) => permission.code));
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string | undefined;
        session.user.role = token.role as string | undefined;
        session.user.permissionLevel = token.permissionLevel as string | undefined;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
        session.user.permissions = (token.permissions as string[] | undefined) ?? [];
      }

      return session;
    }
  }
};
