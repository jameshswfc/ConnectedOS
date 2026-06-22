import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listContacts } from "@/modules/crm/contacts/contact-service";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";

type PageProps = { searchParams?: Promise<{ search?: string }> };

export default async function ContactsPage({ searchParams }: PageProps) {
  const { context, userName } = await getCrmPageContext();
  const resolvedSearchParams = await searchParams;
  const contacts = await listContacts(context, resolvedSearchParams?.search);
  return (
    <AppShell title="Contacts" userName={userName}>
      <div className="mb-4 flex justify-between gap-3"><form className="flex gap-2"><input name="search" defaultValue={resolvedSearchParams?.search} placeholder="Search contacts" className="h-10 rounded-md border border-slate-300 px-3 text-sm" /><Button type="submit" variant="secondary">Search</Button></form><Link href="/crm/contacts/new"><Button>Create Contact</Button></Link></div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Account</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Primary</TableHead></TableRow></TableHeader><TableBody>{contacts.map((contact) => <TableRow key={contact.id}><TableCell><Link href={`/crm/contacts/${contact.id}`} className="font-medium text-brand-700">{contact.firstName} {contact.lastName}</Link></TableCell><TableCell>{contact.account.name}</TableCell><TableCell>{contact.email ?? "-"}</TableCell><TableCell>{contact.phone ?? "-"}</TableCell><TableCell>{contact.isPrimary ? "Yes" : "No"}</TableCell></TableRow>)}</TableBody></Table></div>
    </AppShell>
  );
}
