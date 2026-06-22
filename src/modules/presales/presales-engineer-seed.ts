export const presalesEngineerSeedRole = "Pre-Sales";

export const presalesEngineerSeedUsers = [
  {
    displayName: "Eman Nwokoro",
    email: "eman.nwokoro@example.local",
    isDevelopmentPlaceholder: true
  },
  {
    displayName: "Artur Kellner",
    email: "artur.kellner@example.local",
    isDevelopmentPlaceholder: true
  },
  {
    displayName: "Richard Mumford",
    email: "richard.mumford@example.local",
    isDevelopmentPlaceholder: true
  }
] as const;

export function isDevelopmentPlaceholderEmail(email: string) {
  return email.toLowerCase().endsWith("@example.local");
}
