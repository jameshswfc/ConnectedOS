"use client";

import Link from "next/link";
import { CSSProperties, useMemo, useState, useSyncExternalStore } from "react";
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import type { OpportunityStage } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";
import { formatDate, formatMoney } from "@/modules/crm/ui/crm-format";
import { OpportunityHealthBadge } from "@/modules/crm/ui/opportunity-health-badge";
import type { OpportunityHealthStatus } from "@/modules/crm/opportunities/opportunity-health";

export type PipelineBoardCard = {
  id: string;
  opportunityName: string;
  stage: OpportunityStage;
  accountName: string;
  ownerName: string;
  value: number;
  weightedValue: number;
  probabilityPercent: number;
  expectedCloseDate: string | null;
  nextActivityDate: string | null;
  healthStatus: OpportunityHealthStatus;
};

export type PipelineBoardColumn = {
  stage: OpportunityStage;
  label: string;
  probabilityPercent: number;
  opportunities: PipelineBoardCard[];
  unweightedValue: number;
  weightedValue: number;
};

export function PipelineBoardClient({ initialColumns }: { initialColumns: PipelineBoardColumn[] }) {
  const router = useRouter();
  const isMounted = useIsMounted();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [columns, setColumns] = useState(initialColumns);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stageLabels = useMemo(() => Object.fromEntries(columns.map((column) => [column.stage, column.label])), [columns]);

  async function handleDragEnd(event: DragEndEvent) {
    const opportunityId = String(event.active.id);
    const targetStage = event.over?.id as OpportunityStage | undefined;
    if (!targetStage) return;

    const sourceColumn = columns.find((column) => column.opportunities.some((opportunity) => opportunity.id === opportunityId));
    const opportunity = sourceColumn?.opportunities.find((card) => card.id === opportunityId);
    if (!sourceColumn || !opportunity || sourceColumn.stage === targetStage) return;

    const previousColumns = columns;
    setError(null);
    setMessage(`Moving ${opportunity.opportunityName} to ${stageLabels[targetStage]}.`);
    setColumns(moveOpportunity(columns, opportunityId, targetStage));

    const response = await fetch(`/api/v1/opportunities/${opportunityId}/change-stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: targetStage })
    });

    if (!response.ok) {
      setColumns(previousColumns);
      setMessage(null);
      setError(await friendlyActionError(response, "Stage could not be updated."));
      return;
    }

    setMessage(`${opportunity.opportunityName} moved to ${stageLabels[targetStage]}.`);
    router.refresh();
  }

  if (!isMounted) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <section key={column.stage} className="min-w-72 max-w-72 rounded-lg border border-slate-200 bg-slate-50">
            <div className="border-b border-slate-200 px-3 py-3">
              <h2 className="text-sm font-semibold text-slate-950">{column.label}</h2>
              <p className="mt-1 text-xs text-slate-500">{column.opportunities.length} deals</p>
            </div>
            <div className="p-3 text-sm text-slate-500">Loading pipeline board...</div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {message ? <p className="rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900">{message}</p> : null}
      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <PipelineColumn key={column.stage} column={column} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function useIsMounted() {
  return useSyncExternalStore(subscribeToMount, () => true, () => false);
}

function subscribeToMount() {
  return () => undefined;
}

function PipelineColumn({ column }: { column: PipelineBoardColumn }) {
  const { isOver, setNodeRef } = useDroppable({ id: column.stage });
  return (
    <section ref={setNodeRef} className={`min-w-72 max-w-72 rounded-lg border ${isOver ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-slate-50"}`}>
      <div className="border-b border-slate-200 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">{column.label}</h2>
            <p className="mt-1 text-xs text-slate-500">{column.probabilityPercent}% probability</p>
          </div>
          <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700">{column.opportunities.length}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <span>{formatMoney(column.unweightedValue)}</span>
          <span>{formatMoney(column.weightedValue)} weighted</span>
        </div>
      </div>
      <div className="space-y-3 p-3">
        {column.opportunities.length > 0 ? column.opportunities.map((opportunity) => (
          <PipelineCard key={opportunity.id} opportunity={opportunity} />
        )) : (
          <p className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">No opportunities.</p>
        )}
      </div>
    </section>
  );
}

function PipelineCard({ opportunity }: { opportunity: PipelineBoardCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: opportunity.id });
  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : undefined
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm">
        <CardHeader className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm leading-5"><Link href={`/crm/opportunities/${opportunity.id}`} className="text-brand-700 hover:text-brand-900">{opportunity.opportunityName}</Link></CardTitle>
            <Button type="button" variant="ghost" className="h-7 px-2 text-xs" {...listeners} {...attributes}>Drag</Button>
          </div>
          <p className="text-xs text-slate-500">{opportunity.accountName}</p>
        </CardHeader>
        <CardContent className="space-y-1 p-3 pt-0 text-xs text-slate-600">
          <p>Owner: {opportunity.ownerName}</p>
          <p>Health: <OpportunityHealthBadge status={opportunity.healthStatus} /></p>
          <p>Value: {formatMoney(opportunity.value)}</p>
          <p>Weighted: {formatMoney(opportunity.weightedValue)}</p>
          <p>Close: {formatDate(opportunity.expectedCloseDate)}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function moveOpportunity(columns: PipelineBoardColumn[], opportunityId: string, targetStage: OpportunityStage) {
  const movingCard = columns.flatMap((column) => column.opportunities).find((opportunity) => opportunity.id === opportunityId);
  if (!movingCard) return columns;

  return columns.map((column) => {
    const opportunities = column.opportunities.filter((opportunity) => opportunity.id !== opportunityId);
    const nextOpportunities = column.stage === targetStage
      ? [
          ...opportunities,
          {
            ...movingCard,
            stage: targetStage,
            probabilityPercent: column.probabilityPercent,
            weightedValue: Number(((movingCard.value * column.probabilityPercent) / 100).toFixed(2))
          }
        ]
      : opportunities;
    return {
      ...column,
      opportunities: nextOpportunities,
      unweightedValue: nextOpportunities.reduce((sum, opportunity) => sum + opportunity.value, 0),
      weightedValue: nextOpportunities.reduce((sum, opportunity) => sum + opportunity.weightedValue, 0)
    };
  });
}
