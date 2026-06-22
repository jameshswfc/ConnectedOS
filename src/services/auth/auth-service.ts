import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export type AuthenticatedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  permissionLevel?: string;
  mustChangePassword?: boolean;
  permissions: string[];
};

type RequireAuthenticatedUserOptions = {
  allowPasswordChangeRequired?: boolean;
};

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function requireAuthenticatedUser(options: RequireAuthenticatedUserOptions = {}): Promise<AuthenticatedUser> {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.mustChangePassword && !options.allowPasswordChangeRequired) {
    redirect("/settings/change-password");
  }

  return {
    ...session.user,
    id: session.user.id,
    permissions: session.user.permissions ?? []
  };
}
