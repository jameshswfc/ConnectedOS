import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getContact } from "@/modules/crm/contacts/contact-service";
import { labelFromValue } from "@/modules/crm/ui/crm-format";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

type PageProps = { params: Promise<{ id: string }> };

export default async function ContactDetailPage({ params }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const { id } = await params;
  const contact = await getContact(context, id);
  return (
    <AppShell title={`${contact.firstName} ${contact.lastName}`} userName={userName}>
      <Card><CardHeader><CardTitle>Contact Detail</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-700"><p>Account: {contact.account.name}</p><p>Job title: {contact.jobTitle ?? "-"}</p><p>Email: {contact.email ?? "-"}</p><p>Phone: {contact.phone ?? "-"}</p><p>Mobile: {contact.mobile ?? "-"}</p><p>Relationship: {labelFromValue(contact.relationshipStrength)}</p><p>Primary contact: {contact.isPrimary ? "Yes" : "No"}</p></CardContent></Card>
    </AppShell>
  );
}
