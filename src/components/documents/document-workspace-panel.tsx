"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Folder, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

type Workspace = { status: string; webUrl: string | null; routeId: string | null; lastError: string | null; canManage: boolean; enabled: boolean; routes: { id: string; hotelName: string; location: string }[] };
export function DocumentWorkspacePanel({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [data, setData] = useState<Workspace>();
  const [routeId, setRouteId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/document-workspaces?${new URLSearchParams({ entityType, entityId })}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Document folder information is unavailable.");
      setData(body); setRouteId(body.routeId ?? "");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Document folder information is unavailable."); }
  }, [entityType, entityId]);
  // load updates state only after the network request has settled.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/v1/document-workspaces", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entityType, entityId, routeId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to save document routing.");
      await load(); setMessage("Hotel mapping saved. Folder creation is queued.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save document routing."); }
    finally { setBusy(false); }
  }
  return <section className="my-4 border-y border-slate-200 py-4" aria-label="SharePoint documents">
    <h2 className="flex items-center gap-2 text-base font-semibold"><Folder size={18} />SharePoint documents</h2>
    {data && <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
      <span>{!data.enabled ? "SharePoint not configured" : data.status.replaceAll("_", " ")}</span>
      {data.webUrl && <a href={data.webUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700"><ExternalLink size={16} />Open SharePoint folder</a>}
      {data.canManage && !data.webUrl && <><select aria-label="Verified hotel mapping" value={routeId} onChange={(event) => setRouteId(event.target.value)} className="max-w-full rounded border p-2"><option value="">Select hotel mapping</option>{data.routes.map((route) => <option key={route.id} value={route.id}>{route.hotelName} · {route.location}</option>)}</select><Button disabled={busy || !routeId} onClick={save}><Save size={16} className="mr-2" />Save mapping</Button><Link href="/presales/intake" className="text-brand-700">Manage hotel mappings</Link></>}
      {data.lastError && <p className="w-full text-amber-800">{data.lastError}</p>}
    </div>}
    {message && <p role="status" className="mt-2 text-sm">{message}</p>}
  </section>;
}
