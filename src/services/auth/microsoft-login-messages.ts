export function microsoftLoginMessage(code?: string) {
  if (!code) return null;
  const messages: Record<string, string> = {
    MicrosoftTenantRequired: "Please use your Connected Hospitality Microsoft 365 account.",
    MicrosoftMemberRequired: "Your Microsoft account could not be verified as a tenant member. Contact an administrator.",
    MicrosoftAccountLinkRequired: "An administrator needs to link your existing ConnectedOS account to Microsoft 365 before you can sign in.",
    MicrosoftAccountInactive: "Your account is inactive. Contact an administrator."
  };
  return messages[code] ?? "Unable to sign in with Microsoft 365. Please try again or contact an administrator.";
}
