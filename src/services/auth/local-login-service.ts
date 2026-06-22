import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/services/auth/password-service";

export type LocalLoginCredentials = {
  email?: unknown;
  password?: unknown;
};

type LocalLoginUser = Pick<User, "id" | "displayName" | "email" | "passwordHash" | "isActive" | "deletedAt" | "deactivatedAt">;

type LocalLoginSuccess = {
  status: "success";
  user: {
    id: string;
    name: string;
    email: string;
  };
};

type LocalLoginFailure = {
  status: "invalid" | "inactive" | "duplicate";
};

export type LocalLoginResult = LocalLoginSuccess | LocalLoginFailure;

type FindUsersByEmail = (email: string) => Promise<LocalLoginUser[]>;

export function normalizeLoginEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export async function evaluateLocalLogin(credentials: LocalLoginCredentials, findUsersByEmail: FindUsersByEmail): Promise<LocalLoginResult> {
  const email = normalizeLoginEmail(credentials.email);
  const password = typeof credentials.password === "string" ? credentials.password : "";

  if (!email || !password) {
    logLocalLoginAttempt({ submittedEmail: email, userFound: false, hasPasswordHash: false, passwordVerified: false, matchingUserCount: 0 });
    return { status: "invalid" };
  }

  const users = await findUsersByEmail(email);
  const user = users.length === 1 ? users[0] : null;
  const passwordVerified = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false;

  logLocalLoginAttempt({
    submittedEmail: email,
    userId: user?.id,
    storedEmail: user?.email,
    userFound: Boolean(user),
    hasPasswordHash: Boolean(user?.passwordHash),
    passwordVerified,
    isActive: user?.isActive,
    deleted: Boolean(user?.deletedAt),
    deactivated: Boolean(user?.deactivatedAt),
    matchingUserCount: users.length
  });

  if (users.length > 1) {
    return { status: "duplicate" };
  }

  if (!user || user.deletedAt) {
    return { status: "invalid" };
  }

  if (!user.isActive || user.deactivatedAt) {
    return { status: "inactive" };
  }

  if (!passwordVerified) {
    return { status: "invalid" };
  }

  return {
    status: "success",
    user: {
      id: user.id,
      name: user.displayName,
      email: user.email
    }
  };
}

export async function authorizeLocalCredentials(credentials: LocalLoginCredentials) {
  const result = await evaluateLocalLogin(credentials, (email) => prisma.user.findMany({
    where: {
      email: {
        equals: email,
        mode: "insensitive"
      }
    }
  }));

  if (result.status === "inactive") {
    throw new Error("INACTIVE_USER");
  }

  return result.status === "success" ? result.user : null;
}

function logLocalLoginAttempt(details: {
  submittedEmail: string;
  userId?: string;
  storedEmail?: string;
  userFound: boolean;
  hasPasswordHash: boolean;
  passwordVerified: boolean;
  isActive?: boolean;
  deleted?: boolean;
  deactivated?: boolean;
  matchingUserCount: number;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[auth:local-login]", details);
}
