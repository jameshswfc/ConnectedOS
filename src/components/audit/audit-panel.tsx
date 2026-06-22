import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAuditLogsForEntity, summarizeAuditValue } from "@/services/audit/audit-service";

export async function AuditPanel({
  title = "Audit History",
  module,
  entityType,
  entityId
}: {
  title?: string;
  module?: string;
  entityType: string;
  entityId: string;
}) {
  const logs = await listAuditLogsForEntity(entityType, entityId, module);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-700">
        {logs.length ? logs.map((log) => (
          <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-slate-900">{log.action.replaceAll("_", " ")}</p>
              <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString("en-GB")}</p>
            </div>
            <p className="mt-1 text-xs text-slate-500">{log.module} · {log.entityType} · {log.user?.displayName ?? "System"}</p>
            {summarizeAuditValue(log.previousValue) ? <p className="mt-2 text-xs text-slate-600"><span className="font-medium">Before:</span> {summarizeAuditValue(log.previousValue)}</p> : null}
            {summarizeAuditValue(log.newValue) ? <p className="mt-1 text-xs text-slate-600"><span className="font-medium">After:</span> {summarizeAuditValue(log.newValue)}</p> : null}
          </div>
        )) : <p>No audit records.</p>}
      </CardContent>
    </Card>
  );
}
