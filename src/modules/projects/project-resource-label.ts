export function projectResourceDisplayName(resource: {
  resource?: { displayName?: string | null; companyName?: string | null; user?: { displayName?: string | null } | null } | null;
  user?: { displayName?: string | null } | null;
  role?: string | null;
}) {
  return resource.resource?.displayName
    ?? resource.resource?.user?.displayName
    ?? resource.user?.displayName
    ?? "Resource";
}

export function projectResourceOptionLabel(resource: {
  displayName: string;
  companyName?: string | null;
  roleType?: string | null;
  user?: { email?: string | null } | null;
}) {
  const secondary = resource.roleType ?? resource.companyName ?? resource.user?.email ?? null;
  return secondary ? `${resource.displayName} (${secondary})` : resource.displayName;
}
