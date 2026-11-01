"use client";
import { useEffect, useRef, useState } from "react";
import { Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { partnerSubmissionSchema } from "../partner-intake-schemas";

type Prefill = { hotelName: string; brand: string; location: string; address: string; propertyCode: string; partner: string };
const fields = [
  ["requesterName", "Your name", true], ["requesterEmail", "Email", true], ["requesterPhone", "Phone", false], ["company", "Company", true],
  ["hotelName", "Hotel name", true], ["brand", "Brand / sub-brand", true], ["location", "Location / country", true], ["propertyCode", "Property code", false],
  ["rooms", "Number of rooms", false], ["floors", "Number of floors", false], ["requestedDate", "Requested response date", false]
] as const;
export function PartnerSubmissionForm() {
  const token = useRef(""); const submitting = useRef(false);
  const [prefill, setPrefill] = useState<Prefill>(); const [receipt, setReceipt] = useState("");
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    token.current = window.location.hash.slice(1);
    if (!token.current) { setMessage("Open the private invitation link provided by Connected Hospitality."); return; }
    void fetch("/api/public/presales", { method: "POST", headers: { "x-intake-token": token.current, "x-intake-action": "context" } }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "This invitation is unavailable.");
      setPrefill(body.prefill); if (body.receipt) setReceipt(body.receipt);
    }).catch((error: Error) => setMessage(error.message));
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current) return;
    submitting.current = true; setBusy(true); setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const raw = Object.fromEntries([...form].filter(([key]) => key !== "files"));
      const details = partnerSubmissionSchema.safeParse({ ...raw, rooms: raw.rooms === "" ? null : Number(raw.rooms), floors: raw.floors === "" ? null : Number(raw.floors), consent: raw.consent === "on" });
      if (!details.success) throw new Error(details.error.issues[0].message);
      const payload = new FormData(); payload.set("details", JSON.stringify(details.data));
      const files = form.getAll("files").filter((file): file is File => typeof file !== "string" && file.size > 0);
      if (files.length > 5 || files.some((file) => file.size > 5 * 1024 * 1024) || files.reduce((sum, file) => sum + file.size, 0) > 10 * 1024 * 1024) throw new Error("Attach up to five files, no more than 5 MB each and 10 MB in total.");
      for (const file of files) payload.append("files", file);
      const response = await fetch("/api/public/presales", { method: "POST", headers: { "x-intake-token": token.current }, body: payload });
      const body = await response.json(); if (!response.ok) throw new Error(body.error?.message ?? "Unable to submit your request. Please try again.");
      setReceipt(body.receipt);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to submit your request. Please try again."); }
    finally { setBusy(false); submitting.current = false; }
  }
  if (receipt) return <section className="border-y border-emerald-200 py-8"><h2 className="flex items-center gap-2 text-xl font-semibold text-emerald-800"><CheckCircle />Request received</h2><p className="mt-3">Connected Hospitality will review your hotel details and documents.</p><p className="mt-2 break-all text-sm">Reference: {receipt}</p></section>;
  return <>{message && <p role="alert" className="mb-4 rounded border border-amber-300 bg-amber-50 p-3">{message}</p>}{prefill && <form onSubmit={submit} className="space-y-6">
    <p className="border-b pb-4 text-sm">Referring partner: <strong>{prefill.partner}</strong></p>
    <div className="grid gap-4 sm:grid-cols-2">{fields.map(([name, label, required]) => <label key={name} className="block text-sm font-medium">{label}{required ? " *" : ""}<input name={name} required={required} defaultValue={name in prefill ? prefill[name as keyof Prefill] : name === "company" ? prefill.partner : ""} type={name === "requesterEmail" ? "email" : name === "requestedDate" ? "date" : ["rooms", "floors"].includes(name) ? "number" : "text"} min="0" maxLength={254} className="mt-1 block w-full rounded border border-slate-300 bg-white p-2" /></label>)}</div>
    {([["address", "Hotel address", true], ["systems", "Required systems and deliverables", true], ["scope", "Scope and objectives", true], ["existingEquipment", "Existing equipment", false], ["constraints", "Site access, operational constraints and planned deployment dates", false]] as const).map(([name, label, required]) => <label key={name} className="block text-sm font-medium">{label}{required ? " *" : ""}<textarea name={name} required={required} rows={name === "scope" ? 5 : 3} maxLength={name === "scope" ? 12000 : 5000} defaultValue={name === "address" ? prefill.address : ""} className="mt-1 block w-full rounded border border-slate-300 bg-white p-2" /></label>)}
    <label className="block text-sm font-medium">Supporting documents <span className="font-normal">(PDF, PNG, JPEG or text; 5 MB each, 10 MB total)</span><input type="file" name="files" multiple accept=".pdf,.png,.jpg,.jpeg,.txt" className="mt-2 block w-full text-sm" /></label>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="consent" required className="mt-1" />I am authorised to share these details and documents with Connected Hospitality for technical assessment and preparation of this request.</label>
    <Button type="submit" disabled={busy}><Send size={16} className="mr-2" />{busy ? "Submitting…" : "Submit request"}</Button>
  </form>}</>;
}
