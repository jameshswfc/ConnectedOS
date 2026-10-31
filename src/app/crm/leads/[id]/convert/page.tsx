import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AccessDenied } from "@/components/auth/access-denied";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { getLead } from "@/modules/crm/leads/lead-service";
import { canConvertLead } from "@/modules/crm/leads/lead-conversion-service";
import { listAccounts } from "@/modules/crm/accounts/account-service";
import { listContacts } from "@/modules/crm/contacts/contact-service";
import { LeadConversionForm } from "@/modules/crm/ui/lead-conversion-form";

export default async function ConvertLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  const lead = await getLead(context, id).catch((error: unknown) => {
    if (error instanceof Error && (error.message.startsWith("Missing permission") || error.message === "Lead not found")) return null;
    throw error;
  });
  if (!lead || !canConvertLead(context, lead.ownerId)) return <AppShell title="Convert Lead" userName={userName}><AccessDenied /></AppShell>;
  if (lead.convertedOpportunityId) redirect(`/crm/opportunities/${lead.convertedOpportunityId}`);
  const accounts = await listAccounts(context);
  const contacts = await listContacts(context);
  return <AppShell title="Qualify Lead and Create Opportunity" userName={userName}>
    <LeadConversionForm lead={{ id: lead.id, accountId: lead.accountId, contactId: lead.contactId, accountName: lead.accountName, contactName: lead.contactName, email: lead.email, phone: lead.phone }} accounts={accounts.map(({ id, name }) => ({ id, name }))} contacts={contacts.filter((contact) => contact.status === "active").map((contact) => ({ id: contact.id, accountId: contact.accountId, name: `${contact.firstName} ${contact.lastName}` }))} />
  </AppShell>;
}
