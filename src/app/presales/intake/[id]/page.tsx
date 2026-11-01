import Link from "next/link";
import { notFound } from "next/navigation";
import { PresalesRequestCategory, PresalesRequestType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { AccessDenied } from "@/components/auth/access-denied";
import { getCrmPageContext } from "@/modules/crm/ui/crm-page-context";
import { canManagePartnerIntake, canViewPartnerIntake } from "@/services/documents/document-routing";
import { getPresalesCreateOptions } from "@/modules/presales/presales-service";
import { partnerSubmissionSchema } from "@/modules/presales/partner-intake-schemas";
import { IntakeReviewForm } from "@/modules/presales/ui/partner-intake-management";

export default async function IntakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { context, userName } = await getCrmPageContext();
  if (!canViewPartnerIntake(context)) return <AppShell title="Partner submission" userName={userName}><AccessDenied /></AppShell>;
  const { id } = await params;
  const submission = await prisma.partnerSubmission.findUnique({ where: { id }, include: { invitation: { include: { route: true } }, attachments: true } });
  if (!submission) notFound();
  const details = partnerSubmissionSchema.parse(submission.details);
  const options = submission.presalesRequestId || !canManagePartnerIntake(context) ? null : await getPresalesCreateOptions(context);
  return <AppShell title={details.hotelName} userName={userName}><Link href="/presales/intake" className="text-sm text-brand-700">Back to submissions</Link><p className="my-4 text-sm">Referring partner: {submission.invitation.partner} · {submission.status}</p><p className="mb-4 border-l-4 border-amber-400 bg-amber-50 p-3 text-sm">Invitation mapping: {submission.invitation.route.hotelName}, {submission.invitation.route.location}, {submission.invitation.route.brand}. Confirm any corrections before creating the request.</p><dl className="grid gap-4 sm:grid-cols-2">{Object.entries(details).filter(([key]) => key !== "consent").map(([key, value]) => <div key={key} className={key === "scope" ? "sm:col-span-2" : ""}><dt className="text-sm font-medium capitalize text-slate-500">{key.replace(/([A-Z])/g, " $1")}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value === null || value === "" ? "Not provided" : String(value)}</dd></div>)}</dl><section className="mt-6 border-t pt-4"><h2 className="font-semibold">Attachments</h2>{submission.attachments.length ? submission.attachments.map((file) => <p key={file.id} className="mt-2 break-words text-sm">{file.fileName} · {file.scanStatus}{file.scanStatus === "clean" && <a className="ml-3 text-brand-700" href={`/api/v1/presales/intake/${id}/files/${file.id}`}>Download</a>}</p>) : <p className="mt-2 text-sm text-slate-500">No attachments.</p>}</section>{submission.presalesRequestId ? <Link href={`/presales/${submission.presalesRequestId}`} className="mt-6 inline-block font-medium text-brand-700">Open pre-sales request</Link> : options && <IntakeReviewForm id={id} {...options} categories={Object.values(PresalesRequestCategory)} types={Object.values(PresalesRequestType)} />}</AppShell>;
}
