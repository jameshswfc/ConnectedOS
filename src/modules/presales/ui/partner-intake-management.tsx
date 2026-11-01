"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Link as LinkIcon, Save, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

async function action(payload: unknown) {
  const response = await fetch("/api/v1/presales/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Unable to save. Please check the details and try again.");
  return body as { path?: string; href?: string };
}
const inputClass = "mt-1 block w-full rounded border border-slate-300 bg-white p-2 text-sm";

export function InvitationForm({ routes }: { routes: { id: string; hotelName: string; location: string }[] }) {
  const router = useRouter(); const locked = useRef(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [url, setUrl] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (locked.current) return; locked.current = true; setBusy(true); setMessage(""); setUrl("");
    try { const data = Object.fromEntries(new FormData(event.currentTarget)); const result = await action({ action: "invite", ...data }); setUrl(`${window.location.origin}${result.path}`); router.refresh(); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); locked.current = false; }
  }
  return <form onSubmit={submit} className="space-y-3"><h2 className="text-lg font-semibold">Partner invitation</h2><label className="block text-sm">Hotel<select name="routeId" required className={inputClass}><option value="">Select verified hotel</option>{routes.map((route) => <option key={route.id} value={route.id}>{route.hotelName} · {route.location}</option>)}</select></label><label className="block text-sm">Referring partner<input name="partner" required maxLength={200} className={inputClass} /></label><Button disabled={busy || !routes.length}><LinkIcon size={16} className="mr-2" />{busy ? "Creating..." : "Create seven-day invitation"}</Button>{url && <div className="space-y-2"><label className="block text-sm">Private invitation link<input value={url} readOnly className={inputClass} onFocus={(event) => event.target.select()} /></label><Button type="button" variant="secondary" onClick={() => void navigator.clipboard.writeText(url).then(() => setMessage("Invitation link copied.")).catch(() => setMessage("Select the link above to copy it."))}><Copy size={16} className="mr-2" />Copy link</Button></div>}{message && <p role="status" className="text-sm">{message}</p>}</form>;
}

export function HotelMappingForm({ route }: { route?: { id: string; hotelName: string; [key: string]: unknown } }) {
  const router = useRouter(); const locked = useRef(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (locked.current) return; locked.current = true; setBusy(true); setMessage("");
    try { await action({ action: "route", id: route?.id, data: Object.fromEntries(new FormData(event.currentTarget)) }); setMessage("Hotel mapping saved."); router.refresh(); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); locked.current = false; }
  }
  return <details className="border-t py-4"><summary className="cursor-pointer font-semibold">{route ? `Edit mapping: ${route.hotelName}` : "Add hotel mapping"}</summary><form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">{[["hotelName", "Hotel name", true], ["brand", "Brand / sub-brand", true], ["location", "Location / country", true], ["address", "Hotel address", true], ["propertyCode", "Property code", false], ["partner", "Referring partner", false], ["salesParentId", "Sales property folder item ID", false], ["presalesParentId", "Pre-sales property folder item ID", false], ["projectsParentId", "Deployment property folder item ID", false], ["completedParentId", "Completed Sites folder item ID", false]].map(([name, label, required]) => <label key={String(name)} className="block text-sm">{label}<input name={String(name)} defaultValue={String(route?.[String(name)] ?? "")} required={Boolean(required)} maxLength={name === "address" ? 1500 : 200} className={inputClass} /></label>)}<div className="sm:col-span-2"><Button disabled={busy}><Save size={16} className="mr-2" />Save hotel mapping</Button>{message && <p role="status" className="mt-2 text-sm">{message}</p>}</div></form></details>;
}

export function RevokeInvitationButton({ id }: { id: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  return <><Button disabled={busy} variant="secondary" onClick={async () => { setBusy(true); try { await action({ action: "revoke", id }); router.refresh(); } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); } }}><Ban size={14} className="mr-1" />Revoke</Button>{message && <p role="alert">{message}</p>}</>;
}

export function IntakeReviewForm({ id, accounts, opportunities, engineers, categories, types }: { id: string; accounts: { id: string; name: string }[]; opportunities: { id: string; accountId: string; name: string }[]; engineers: { id: string; name: string }[]; categories: string[]; types: string[] }) {
  const router = useRouter(); const locked = useRef(false); const [accountId, setAccountId] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (locked.current) return; locked.current = true; setBusy(true); setMessage("");
    try { const data = Object.fromEntries(new FormData(event.currentTarget)); const result = await action({ action: "review", id, confirmHotelMapping: data.confirmHotelMapping === "on", data }); if (result.href) router.push(result.href); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); locked.current = false; }
  }
  return <form onSubmit={submit} className="mt-6 grid gap-4 border-t pt-6 sm:grid-cols-2"><h2 className="text-lg font-semibold sm:col-span-2">Create pre-sales request</h2><label className="text-sm">Billing account<select name="accountId" required className={inputClass} value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Select account</option>{accounts.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label className="text-sm">Opportunity<select key={accountId} name="opportunityId" className={inputClass} disabled={!accountId}><option value="">No linked opportunity</option>{opportunities.filter((row) => row.accountId === accountId).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label className="text-sm">Engineer<select name="assignedToId" className={inputClass}><option value="">Assign later</option>{engineers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label className="text-sm">Internal deadline<input name="internalDeadline" type="date" required className={inputClass} /></label>{([["requestCategory", "Category", categories], ["requestType", "Request type", types]] as const).map(([name, label, options]) => <label key={name} className="text-sm">{label}<select name={name} required className={inputClass}>{options.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>)}<label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="confirmHotelMapping" required className="mt-1" />I have checked the submitted hotel details against the invitation hotel mapping and confirmed the correct destination.</label><div className="sm:col-span-2"><Button disabled={busy}><Save size={16} className="mr-2" />{busy ? "Creating..." : "Create pre-sales request"}</Button>{message && <p role="alert" className="mt-2">{message}</p>}</div></form>;
}
