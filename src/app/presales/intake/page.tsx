import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { AccessDenied } from "@/components/auth/access-denied";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { canManageDocumentRouting, canManagePartnerIntake } from "@/services/documents/document-routing";
import { HotelMappingForm, InvitationForm, RevokeInvitationButton } from "@/modules/presales/ui/partner-intake-management";
import { partnerSubmissionSchema } from "@/modules/presales/partner-intake-schemas";

export default async function IntakePage() {
  const { context, userName } = await getCrmPageContext();
  if (!canManagePartnerIntake(context)) return <AppShell title="Partner submissions" userName={userName}><AccessDenied /></AppShell>;
  const routes = await prisma.documentRoute.findMany({ where: { active: true }, orderBy: { hotelName: "asc" } });
  const submissions = await prisma.partnerSubmission.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { invitation: true, _count: { select: { attachments: true } } } });
  const invitations = await prisma.presalesInvitation.findMany({ where: { revokedAt: null, expiresAt: { gt: new Date() }, submission: null }, include: { route: true }, orderBy: { createdAt: "desc" }, take: 100 });
  return <AppShell title="Partner submissions" userName={userName}>
    {process.env.PARTNER_INTAKE_ENABLED !== "true" && <p className="mb-6 border-l-4 border-amber-400 bg-amber-50 p-3 text-sm">Partner intake is not enabled. Invitations can be prepared, but cannot accept submissions yet.</p>}
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]"><section><h2 className="mb-3 text-lg font-semibold">Review queue</h2>{submissions.length ? <div className="divide-y border-y">{submissions.map((row) => { const details = partnerSubmissionSchema.parse(row.details); return <Link key={row.id} href={`/presales/intake/${row.id}`} className="block py-4"><p className="font-medium text-brand-700">{details.hotelName} · {details.location}</p><p className="mt-1 text-sm text-slate-600">{row.invitation.partner} · {row.status} · {row._count.attachments} files · {row.createdAt.toLocaleDateString("en-GB")}</p></Link>; })}</div> : <p className="py-6 text-slate-600">No partner submissions yet.</p>}</section><InvitationForm routes={routes.map(({ id, hotelName, location }) => ({ id, hotelName, location }))} /></div>
    <section className="mt-8"><h2 className="mb-3 text-lg font-semibold">Active invitations</h2>{invitations.map((invitation) => <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-3"><p>{invitation.route.hotelName} · {invitation.partner}<span className="ml-2 text-sm text-slate-500">Expires {invitation.expiresAt.toLocaleDateString("en-GB")}</span></p><RevokeInvitationButton id={invitation.id} /></div>)}</section>
    {canManageDocumentRouting(context) && <div className="mt-6"><HotelMappingForm />{routes.map(({ createdAt: _createdAt, updatedAt: _updatedAt, ...route }) => <HotelMappingForm key={route.id} route={route} />)}</div>}
  </AppShell>;
}
