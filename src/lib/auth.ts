import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { assignedRoleNames, combinedRolePermissions, userAccessInclude } from "@/services/permissions/user-roles";
import { authorizeLocalCredentials } from "@/services/auth/local-login-service";
import { permissionCodesForLevel } from "@/services/users/user-service";
import { isMicrosoftLoginEnabled, MicrosoftLoginError, signInMicrosoftUser } from "@/services/auth/microsoft-login-service";

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
    ...(isMicrosoftLoginEnabled()
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID ?? "",
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
            tenantId: process.env.AZURE_AD_TENANT_ID,
            // Sign-in must not depend on Graph/photo permissions or network calls.
            profile(profile) {
              return { id: profile.sub, name: profile.name, email: profile.email, image: null };
            }
          })
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60
  },
  pages: {
    signIn: "/login",
    error: "/login"
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

      if (account?.provider !== "azure-ad" || !isMicrosoftLoginEnabled()) return false;
      try {
        const member = await signInMicrosoftUser(profile);
        user.id = member.id;
        user.name = member.displayName;
        user.email = member.email;
        return true;
      } catch (error) {
        if (error instanceof MicrosoftLoginError) return `/login?error=${error.reason}`;
        console.error("[auth:microsoft] Sign-in failed", { message: error instanceof Error ? error.message : String(error) });
        return "/login?error=MicrosoftSignInFailed";
      }
    },
    async jwt({ token, user, account }) {
      if (account) token.authProvider = account.provider;
      const userId = typeof user?.id === "string" ? user.id : typeof token.userId === "string" ? token.userId : undefined;
      if (!userId) return { ...token, userId: undefined, role: undefined, roles: [], permissionLevel: undefined, permissions: [], mustChangePassword: false };
      const dbUser = await prisma.user.findFirst({
        where: { id: userId },
        include: userAccessInclude
      });

      if (!dbUser || !dbUser.isActive || dbUser.deletedAt || dbUser.deactivatedAt) {
        return { ...token, userId: undefined, role: undefined, roles: [], permissionLevel: undefined, permissions: [], mustChangePassword: false };
      }

      const allPermissions = await prisma.permission.findMany({ select: { code: true } });
      const rolePermissions = combinedRolePermissions(dbUser);
      token.userId = dbUser.id;
      token.name = dbUser.displayName;
      token.email = dbUser.email;
      token.role = dbUser.role.name;
      token.roles = assignedRoleNames(dbUser);
      token.permissionLevel = dbUser.permissionLevel;
      token.mustChangePassword = token.authProvider !== "azure-ad" && dbUser.mustChangePassword;
      token.permissions = permissionCodesForLevel(dbUser.permissionLevel, rolePermissions, allPermissions.map((permission) => permission.code));
      return token;
    },
    async session({ session, token }) {
      if (!token.userId) {
        session.user = undefined;
        return session;
      }
      if (session.user) {
        session.user.id = token.userId as string | undefined;
        session.user.role = token.role as string | undefined;
        session.user.roles = token.roles ?? [];
        session.user.permissionLevel = token.permissionLevel as string | undefined;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
        session.user.permissions = (token.permissions as string[] | undefined) ?? [];
        session.user.authProvider = token.authProvider;
      }

      return session;
    }
  }
};
