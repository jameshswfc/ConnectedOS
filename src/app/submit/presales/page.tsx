import Image from "next/image";
import type { Metadata } from "next";
import { brandAssets } from "@/lib/brand";
import { PartnerSubmissionForm } from "@/modules/presales/ui/partner-submission-form";

export const metadata: Metadata = { title: "Pre-sales request | Connected Hospitality", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function PartnerSubmissionPage() {
  return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-8"><header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6"><div><h1 className="text-2xl font-semibold text-brand-900">Pre-sales request</h1><p className="mt-2 text-slate-600">Connected Hospitality</p></div><Image src={brandAssets.logo} width={190} height={190} loading="eager" alt="Connected Hospitality" className="h-auto w-28 sm:w-36" /></header><PartnerSubmissionForm /></main>;
}
