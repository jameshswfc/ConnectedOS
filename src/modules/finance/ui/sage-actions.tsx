"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SageActions({ connected, manage, writeEnabled = false }: { connected: boolean; manage: boolean; writeEnabled?: boolean }) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function run(action: "connect" | "sync") {
    if (busy.current) return;
    busy.current = true; setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/integrations/sage/${action}`, { method: "POST", signal: AbortSignal.timeout(180000) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.errors?.[0]?.message ?? "Unable to complete the Sage request.");
      if (action === "connect") {
        const url = new URL(body.data.url);
        if (url.origin !== "https://www.sageone.com") throw new Error("Unable to verify the Sage sign-in destination.");
        window.location.assign(url.toString());
      } else { setMessage(`${body.data.count} invoices refreshed.`); router.refresh(); }
    } catch (error) { setMessage(error instanceof Error && error.name !== "TimeoutError" ? error.message : "Sage refresh took too long. Refresh this page before trying again."); }
    finally { busy.current = false; setPending(false); }
  }
  return <div className="space-y-2"><div className="flex flex-wrap gap-2">{manage ? <Button onClick={() => run("connect")} disabled={pending}><Link2 className="mr-2 h-4 w-4" aria-hidden="true" />{writeEnabled ? "Connect Sage with invoice creation access" : connected ? "Reconnect Sage read-only" : "Connect Sage read-only"}</Button> : null}{connected ? <Button variant="secondary" onClick={() => run("sync")} disabled={pending}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />{pending ? "Please wait" : "Refresh invoices"}</Button> : null}</div><p role="status" className="text-sm text-slate-700">{message}</p></div>;
}
