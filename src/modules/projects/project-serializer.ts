type DecimalLike = {
  toNumber?: () => number;
  toFixed?: (digits?: number) => string;
  toJSON?: () => unknown;
  toString: () => string;
};

type UserOption = { id: string; displayName: string; email?: string | null };
type ResourceOption = { id: string; displayName: string; companyName?: string | null; roleType?: string | null; user?: { email?: string | null } | null };

export function serializeProject<T>(project: T): SerializableProject<T> {
  return serializeProjectValue(project) as SerializableProject<T>;
}

export function serializeProjectTask<T>(task: T): SerializableProject<T> {
  return serializeProject(task);
}

export function buildProjectUserOptions(users: UserOption[]) {
  const duplicateNames = users.reduce<Map<string, number>>((counts, user) => {
    counts.set(user.displayName, (counts.get(user.displayName) ?? 0) + 1);
    return counts;
  }, new Map());

  return users.map((user) => ({
    id: user.id,
    label: (duplicateNames.get(user.displayName) ?? 0) > 1 && user.email
      ? `${user.displayName} (${user.email})`
      : user.displayName
  }));
}

export function buildProjectResourceOptions(resources: ResourceOption[]) {
  const duplicateNames = resources.reduce<Map<string, number>>((counts, resource) => {
    counts.set(resource.displayName, (counts.get(resource.displayName) ?? 0) + 1);
    return counts;
  }, new Map());

  return resources.map((resource) => {
    const secondary = resource.roleType ?? resource.companyName ?? resource.user?.email ?? null;
    const label = (duplicateNames.get(resource.displayName) ?? 0) > 1 && secondary
      ? `${resource.displayName} (${secondary})`
      : secondary && resource.roleType
        ? `${resource.displayName} (${secondary})`
        : resource.displayName;
    return { id: resource.id, label };
  });
}

type DecimalishType = { toNumber?: (...args: never[]) => number } | { toFixed?: (...args: never[]) => string };

export type SerializableProject<T> =
  T extends Date ? string
    : T extends DecimalishType ? number
      : T extends Array<infer Item> ? SerializableProject<Item>[]
        : T extends object ? { [Key in keyof T]: SerializableProject<T[Key]> }
          : T;

function serializeProjectValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => serializeProjectValue(item));
  if (isDecimalLike(value)) return decimalToNumber(value);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeProjectValue(item)])
    );
  }
  return value;
}

function isDecimalLike(value: unknown): value is DecimalLike {
  if (!value || typeof value !== "object" || value instanceof Date || Array.isArray(value)) return false;
  const candidate = value as DecimalLike & { constructor?: { name?: string } };
  return candidate.constructor?.name === "Decimal"
    || typeof candidate.toNumber === "function"
    || typeof candidate.toFixed === "function";
}

function decimalToNumber(value: DecimalLike) {
  if (typeof value.toNumber === "function") return value.toNumber();
  if (typeof value.toJSON === "function") return Number(value.toJSON());
  return Number(value.toString());
}
