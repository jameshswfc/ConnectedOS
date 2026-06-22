"use client";

import { useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Option = { id: string; label: string; meta?: string };
type QuoteOption = Option & { projectType?: string };

export function ProjectCreateForm({ quotes, templates, managers, projectTypes }: { quotes: QuoteOption[]; templates: Option[]; managers: Option[]; projectTypes: Option[] }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(formData: FormData) {
    setSubmitting(true);
    setError(null);
    const quoteId = String(formData.get("quoteId") ?? "");
    const response = await fetch(`/api/v1/quotes/${quoteId}/create-project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectType: formData.get("projectType") || undefined,
        templateId: formData.get("templateId") || null,
        projectManagerId: formData.get("projectManagerId") || null,
        startDate: formData.get("startDate") || undefined,
        targetEndDate: formData.get("targetEndDate") || undefined,
        baselineStartDate: formData.get("baselineStartDate") || undefined,
        baselineEndDate: formData.get("baselineEndDate") || undefined,
        totalResourceDaysBudget: formData.get("totalResourceDaysBudget") || undefined,
        scopeSummary: formData.get("scopeSummary") || undefined
      })
    });
    const payload = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(payload?.errors?.[0]?.message ?? "Unable to create project.");
      return;
    }
    window.location.href = `/projects/${payload.data.id}`;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(new FormData(event.currentTarget));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      <label className="block text-sm font-medium text-slate-700">Approved / accepted quote<select name="quoteId" required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3"><option value="">Select quote</option>{quotes.map((quote) => <option key={quote.id} value={quote.id}>{quote.label}{quote.meta ? ` - ${quote.meta}` : ""}</option>)}</select></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">Project type<select name="projectType" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3"><option value="">Use opportunity type</option>{projectTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label>
        <label className="block text-sm font-medium text-slate-700">Task template<select name="templateId" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3"><option value="">No template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}</select></label>
        <label className="block text-sm font-medium text-slate-700">Project manager<select name="projectManagerId" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3"><option value="">Unassigned</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.label}{manager.meta ? ` - ${manager.meta}` : ""}</option>)}</select></label>
        <label className="block text-sm font-medium text-slate-700">Resource day budget<input name="totalResourceDaysBudget" type="number" min="0" step="0.5" placeholder="Auto from LAB quote lines" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
        <label className="block text-sm font-medium text-slate-700">Start date<input name="startDate" type="date" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
        <label className="block text-sm font-medium text-slate-700">Target end date<input name="targetEndDate" type="date" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
        <label className="block text-sm font-medium text-slate-700">Baseline start<input name="baselineStartDate" type="date" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
        <label className="block text-sm font-medium text-slate-700">Baseline finish<input name="baselineEndDate" type="date" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      </div>
      <label className="block text-sm font-medium text-slate-700">Scope summary<textarea name="scopeSummary" rows={4} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Project"}</Button>
    </form>
  );
}

export function CreateProjectFromQuoteButton({ quoteId, disabled }: { quoteId: string; disabled?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  async function createProject() {
    setError(null);
    setSubmitting(true);
    const response = await fetch(`/api/v1/quotes/${quoteId}/create-project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "initiation" })
    });
    const payload = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(payload?.errors?.[0]?.message ?? "Unable to create project.");
      return;
    }
    window.location.href = `/projects/${payload.data.id}`;
  }
  return <div className="space-y-1"><Button type="button" disabled={disabled || submitting} onClick={createProject}>{submitting ? "Creating..." : "Create Project"}</Button>{error ? <p className="text-xs text-red-700">{error}</p> : null}</div>;
}

export function ProjectPatchForm({ projectId, action, children, buttonLabel }: { projectId: string; action: Record<string, unknown>; children?: ReactNode; buttonLabel: string }) {
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setError(null);
    const response = await fetch(`/api/v1/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload?.errors?.[0]?.message ?? "Unable to update project.");
      return;
    }
    window.location.reload();
  }
  return <div className="space-y-2">{children}{error ? <p className="text-sm text-red-700">{error}</p> : null}<Button type="button" onClick={submit}>{buttonLabel}</Button></div>;
}

export function ProjectLockPlanButton({ projectId }: { projectId: string }) {
  return <JsonButton endpoint={`/api/v1/projects/${projectId}/lock-plan`} method="POST" label="Lock Project Plan" />;
}

export function ProjectEditForm({ project, projectTypes }: { project: { id: string; name: string; projectType: string; status: string; startDate?: string | null; targetEndDate?: string | null; baselineStartDate?: string | null; baselineEndDate?: string | null; actualStartDate?: string | null; actualEndDate?: string | null; scopeSummary?: string | null; description?: string | null; totalResourceDaysBudget: unknown; invoicedAmount: unknown; collectedAmount: unknown; paymentTerms?: string | null }; projectTypes: Option[] }) {
  return (
    <QuickJsonForm
      endpoint={`/api/v1/projects/${project.id}`}
      method="PATCH"
      buttonLabel="Save Project"
      fields={[
        { name: "name", label: "Project name", required: true, defaultValue: project.name },
        { name: "projectType", label: "Project type", type: "select", options: projectTypes, defaultValue: project.projectType },
        { name: "status", label: "Status", type: "select", options: ["draft", "initiation", "planning", "active", "on_hold", "at_risk", "completed", "closed", "cancelled"].map((value) => ({ id: value, label: value.replaceAll("_", " ") })), defaultValue: project.status },
        { name: "startDate", label: "Start date", type: "date", defaultValue: project.startDate ?? undefined },
        { name: "targetEndDate", label: "Target end date", type: "date", defaultValue: project.targetEndDate ?? undefined },
        { name: "baselineStartDate", label: "Baseline start", type: "date", defaultValue: project.baselineStartDate ?? undefined },
        { name: "baselineEndDate", label: "Baseline finish", type: "date", defaultValue: project.baselineEndDate ?? undefined },
        { name: "actualStartDate", label: "Actual start date", type: "date", defaultValue: project.actualStartDate ?? undefined },
        { name: "actualEndDate", label: "Actual end date", type: "date", defaultValue: project.actualEndDate ?? undefined },
        { name: "totalResourceDaysBudget", label: "Resource day budget", type: "number", defaultValue: String(project.totalResourceDaysBudget ?? 0) },
        { name: "invoicedAmount", label: "Invoiced", type: "number", defaultValue: String(project.invoicedAmount ?? 0) },
        { name: "collectedAmount", label: "Collected", type: "number", defaultValue: String(project.collectedAmount ?? 0) },
        { name: "scopeSummary", label: "Scope summary", type: "textarea", defaultValue: project.scopeSummary ?? "" },
        { name: "description", label: "Description", type: "textarea", defaultValue: project.description ?? "" },
        { name: "paymentTerms", label: "Payment terms", type: "textarea", defaultValue: project.paymentTerms ?? "" }
      ]}
    />
  );
}

export function ProjectTaskQuickForm({ projectId, users }: { projectId: string; users: Option[] }) {
  return (
    <QuickJsonForm
      endpoint={`/api/v1/projects/${projectId}/tasks`}
      buttonLabel="Add Task"
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "assignedToId", label: "Assignee", type: "select", options: users },
        { name: "startDate", label: "Start", type: "date", required: true },
        { name: "endDate", label: "End", type: "date", required: true },
        { name: "estimatedDays", label: "Estimated days", type: "number" }
      ]}
    />
  );
}

export function ProjectTaskActionButtons({
  taskId,
  estimatedDays,
  actualDays
}: {
  taskId: string;
  estimatedDays: number | string | null | undefined;
  actualDays: number | string | null | undefined;
}) {
  return (
    <div className="flex gap-2">
      <ProjectTaskCompleteButton taskId={taskId} estimatedDays={estimatedDays} actualDays={actualDays} />
      <JsonButton endpoint={`/api/v1/project-tasks/${taskId}`} method="DELETE" label="Delete" variant="secondary" confirmMessage="Delete this task?" />
    </div>
  );
}

export function ProjectTaskDependencyCreateForm({
  successorTaskId,
  taskOptions
}: {
  successorTaskId: string;
  taskOptions: Option[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function submit(formData: FormData) {
    if (submittingRef.current) return;
    const predecessorTaskId = String(formData.get("predecessorTaskId") ?? "");
    if (!predecessorTaskId) {
      setError("Select a predecessor task.");
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/project-tasks/${predecessorTaskId}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          successorTaskId,
          dependencyType: String(formData.get("dependencyType") ?? "finish_to_start"),
          lagDays: Number(formData.get("lagDays") ?? 0)
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.errors?.[0]?.message ?? "Unable to add dependency.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Unable to add dependency.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
      className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_100px_auto]"
    >
      <label className="text-xs font-medium text-slate-700">
        Predecessor task
        <select name="predecessorTaskId" required className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm">
          <option value="">Select task</option>
          {taskOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
      <label className="text-xs font-medium text-slate-700">
        Type
        <select name="dependencyType" defaultValue="finish_to_start" className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm">
          <option value="finish_to_start">FS</option>
          <option value="start_to_start">SS</option>
          <option value="finish_to_finish">FF</option>
          <option value="start_to_finish">SF</option>
        </select>
      </label>
      <label className="text-xs font-medium text-slate-700">
        Lag days
        <input name="lagDays" type="number" min="0" defaultValue="0" className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" />
      </label>
      <div className="flex items-end">
        <Button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add Dependency"}</Button>
      </div>
      {error ? <p className="md:col-span-4 text-xs text-red-700">{error}</p> : null}
    </form>
  );
}

export function ProjectTaskDependencyDeleteButton({ dependencyId }: { dependencyId: string }) {
  return <JsonButton endpoint={`/api/v1/project-task-dependencies/${dependencyId}`} method="DELETE" label="Remove" variant="secondary" confirmMessage="Remove this dependency?" />;
}

export function ProjectTaskInlineEditForm({
  task,
  users
}: {
  task: {
    id: string;
    title: string;
    description?: string | null;
    assignedToId?: string | null;
    startDate: Date | string;
    endDate: Date | string;
    status: string;
    estimatedDays?: unknown;
    actualDays: unknown;
  };
  users: Option[];
}) {
  return (
    <QuickJsonForm
      endpoint={`/api/v1/project-tasks/${task.id}`}
      method="PATCH"
      buttonLabel="Save Task"
      errorMessage="Unable to update task dates. Please check the dates and try again."
      fields={[
        { name: "title", label: "Title", required: true, defaultValue: task.title },
        { name: "description", label: "Description", type: "textarea", defaultValue: task.description ?? "" },
        { name: "assignedToId", label: "Assignee", type: "select", options: users, defaultValue: task.assignedToId ?? undefined },
        { name: "startDate", label: "Start date", type: "date", required: true, defaultValue: dateInputValue(task.startDate) },
        { name: "endDate", label: "End date", type: "date", required: true, defaultValue: dateInputValue(task.endDate) },
        { name: "estimatedDays", label: "Forecast days", type: "number", defaultValue: String(task.estimatedDays ?? 0) },
        { name: "status", label: "Status", type: "select", options: ["not_started", "in_progress", "blocked", "complete", "cancelled"].map((value) => ({ id: value, label: value.replaceAll("_", " ") })), defaultValue: task.status },
        { name: "actualDays", label: "Actual days", type: "number", defaultValue: String(task.actualDays ?? 0) }
      ]}
    />
  );
}

export function ProjectMilestoneActionButtons({ milestoneId }: { milestoneId: string }) {
  return <JsonButton endpoint={`/api/v1/project-milestones/${milestoneId}`} method="PATCH" body={{ status: "complete" }} label="Complete" />;
}

export function ProjectMilestoneInlineEditForm({
  milestone,
  users
}: {
  milestone: {
    id: string;
    title: string;
    description?: string | null;
    milestoneDate: Date | string;
    manualDateOverride?: boolean | null;
    status: string;
    ownerId?: string | null;
  };
  users: Option[];
}) {
  return (
    <QuickJsonForm
      endpoint={`/api/v1/project-milestones/${milestone.id}`}
      method="PATCH"
      buttonLabel="Save Milestone"
      fields={[
        { name: "title", label: "Title", required: true, defaultValue: milestone.title },
        { name: "description", label: "Commentary / notes", type: "textarea", defaultValue: milestone.description ?? "" },
        { name: "milestoneDate", label: "Milestone date", type: "date", required: true, defaultValue: dateInputValue(milestone.milestoneDate) },
        { name: "manualDateOverride", label: "Manual date override", type: "checkbox", defaultValue: milestone.manualDateOverride ? "true" : "false" },
        { name: "status", label: "Status", type: "select", options: ["not_started", "in_progress", "complete", "delayed", "cancelled"].map((value) => ({ id: value, label: value.replaceAll("_", " ") })), defaultValue: milestone.status },
        { name: "ownerId", label: "Owner", type: "select", options: users, defaultValue: milestone.ownerId ?? undefined }
      ]}
    />
  );
}

export function ProjectStageGateActionButtons({ stageGateId }: { stageGateId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <JsonButton endpoint={`/api/v1/project-stage-gates/${stageGateId}`} method="PATCH" body={{ status: "in_progress" }} label="In Progress" variant="secondary" />
      <JsonButton endpoint={`/api/v1/project-stage-gates/${stageGateId}`} method="PATCH" body={{ status: "complete" }} label="Complete" />
      <JsonButton endpoint={`/api/v1/project-stage-gates/${stageGateId}`} method="PATCH" body={{ status: "blocked" }} label="Block" variant="secondary" />
    </div>
  );
}

export function ProjectChangeRequestActionButtons({ changeRequestId, status }: { changeRequestId: string; status?: string }) {
  if (status === "approved" || status === "rejected" || status === "cancelled") return null;
  return (
    <div className="flex flex-wrap gap-2">
      <JsonButton endpoint={`/api/v1/project-change-requests/${changeRequestId}/approve`} method="POST" label="Approve" />
      <JsonButton endpoint={`/api/v1/project-change-requests/${changeRequestId}/reject`} method="POST" body={{ reason: "Rejected from project change request tab" }} label="Reject" variant="secondary" confirmMessage="Reject this change request?" />
    </div>
  );
}

export function CreateChangeQuoteButton({ changeRequestId }: { changeRequestId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  async function createChangeQuote() {
    if (submittingRef.current) return;
    setError(null);
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/project-change-requests/${changeRequestId}/create-change-quote`, {
        method: "POST"
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.errors?.[0]?.message ?? "Unable to create change quote.");
        return;
      }
      const quoteId = payload?.data?.quoteId;
      const versionId = payload?.data?.versionId;
      if (!quoteId || !versionId) {
        setError("Change quote was created but the builder link was unavailable.");
        return;
      }
      window.location.href = `/quotes/${quoteId}/versions/${versionId}`;
    } catch {
      setError("Unable to create change quote.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }
  return <div>{error ? <p className="mb-1 text-xs text-red-700">{error}</p> : null}<Button type="button" onClick={createChangeQuote} disabled={submitting}>{submitting ? "Opening..." : "Create Change Quote"}</Button></div>;
}

export function AddDefaultTasksButton({ projectId }: { projectId: string }) {
  return <JsonButton endpoint={`/api/v1/projects/${projectId}/default-tasks`} method="POST" label="Add Missing Default Tasks" variant="secondary" />;
}

export function AddDefaultDependenciesButton({ projectId }: { projectId: string }) {
  return <JsonButton endpoint={`/api/v1/projects/${projectId}/default-dependencies`} method="POST" label="Add Missing Default Dependencies" variant="secondary" />;
}

export function ProjectResourceQuickForm({ projectId, resources }: { projectId: string; resources: Option[] }) {
  return (
    <QuickJsonForm
      endpoint={`/api/v1/projects/${projectId}/resources`}
      buttonLabel="Add Resource"
      fields={[
        { name: "resourceId", label: "Resource", type: "select", options: resources, required: true },
        { name: "role", label: "Role", type: "select", options: ["project_manager", "technical_lead", "project_engineer", "field_engineer", "pre_sales_engineer", "other"].map((value) => ({ id: value, label: value.replaceAll("_", " ") })) },
        { name: "startDate", label: "Start", type: "date", required: true },
        { name: "endDate", label: "End", type: "date", required: true },
        { name: "scheduledDays", label: "Scheduled days override", type: "number" },
        { name: "usedDays", label: "Used days", type: "number" },
        { name: "conflictOverride", label: "Override conflict", type: "checkbox" },
        { name: "conflictOverrideNote", label: "Override note" }
      ]}
    />
  );
}

export function ProjectResourceDeleteButton({ resourceId }: { resourceId: string }) {
  return <JsonButton endpoint={`/api/v1/project-resources/${resourceId}`} method="DELETE" label="Remove" variant="secondary" confirmMessage="Remove this resource assignment?" />;
}

export function ProjectIssueQuickForm({ projectId, users }: { projectId: string; users: Option[] }) {
  return (
    <QuickJsonForm
      endpoint={`/api/v1/projects/${projectId}/issues-actions`}
      buttonLabel="Add Issue / Action"
      fields={[
        { name: "type", label: "Type", type: "select", options: ["issue", "action", "risk", "decision"].map((value) => ({ id: value, label: value })) },
        { name: "title", label: "Title", required: true },
        { name: "ownerId", label: "Owner", type: "select", options: users },
        { name: "priority", label: "Priority", type: "select", options: ["low", "normal", "high", "urgent"].map((value) => ({ id: value, label: value })) },
        { name: "dueDate", label: "Due date", type: "date" }
      ]}
    />
  );
}

export function ProjectFinancialQuickForm({ projectId }: { projectId: string }) {
  return (
    <QuickJsonForm
      endpoint={`/api/v1/projects/${projectId}/financial-entries`}
      buttonLabel="Add Budget Entry"
      fields={[
        { name: "type", label: "Type", type: "select", options: ["invoice", "payment", "cost", "purchase_order_placeholder"].map((value) => ({ id: value, label: value.replaceAll("_", " ") })) },
        { name: "description", label: "Description", required: true },
        { name: "amount", label: "Amount", type: "number" },
        { name: "status", label: "Status", type: "select", options: ["planned", "raised", "paid", "collected", "cancelled"].map((value) => ({ id: value, label: value })) },
        { name: "reference", label: "Reference" },
        { name: "expectedDate", label: "Expected date", type: "date" }
      ]}
    />
  );
}

export function ProjectFormQuickForm({ projectId, formType, buttonLabel }: { projectId: string; formType: string; buttonLabel: string }) {
  if (formType === "weekly_update") {
    return <WeeklyUpdateQuickForm projectId={projectId} buttonLabel={buttonLabel} />;
  }
  if (formType === "change_request") {
    return <ProjectChangeRequestQuickForm projectId={projectId} buttonLabel={buttonLabel} />;
  }
  return (
    <QuickJsonForm
      endpoint={`/api/v1/projects/${projectId}/${formType === "daily_update" ? "daily-updates" : formType === "weekly_update" ? "weekly-updates" : formType === "change_request" ? "change-requests" : formType === "closure" ? "closure" : "support-handover"}`}
      buttonLabel={buttonLabel}
      fields={projectFormFields(formType)}
      fixed={{ formType }}
    />
  );
}

function WeeklyUpdateQuickForm({ projectId, buttonLabel }: { projectId: string; buttonLabel: string }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function submit(formData: FormData) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        formType: "weekly_update",
        title: String(formData.get("title") ?? "").trim(),
        content: {
          reportingPeriodStart: formData.get("reportingPeriodStart") || undefined,
          reportingPeriodEnd: formData.get("reportingPeriodEnd") || undefined,
          reportNumber: formData.get("reportNumber") || undefined,
          currentStage: formData.get("currentStage") || undefined,
          status: formData.get("status") || undefined,
          executiveSummary: formData.get("executiveSummary") || undefined,
          pmCommentary: formData.get("pmCommentary") || undefined,
          overallCommentary: formData.get("overallCommentary") || undefined,
          scheduleCommentary: formData.get("scheduleCommentary") || undefined,
          budgetCommentary: formData.get("budgetCommentary") || undefined,
          scopeCommentary: formData.get("scopeCommentary") || undefined,
          risksIssuesCommentary: formData.get("risksIssuesCommentary") || undefined,
          resourcesCommentary: formData.get("resourcesCommentary") || undefined,
          customerReadinessCommentary: formData.get("customerReadinessCommentary") || undefined,
          operationalImpactCommentary: formData.get("operationalImpactCommentary") || undefined,
          customerDecisionRows: parseDelimitedRows(String(formData.get("customerDecisionRows") ?? ""), 5),
          connectedHospitalityResourcesStatus: formData.get("connectedHospitalityResourcesStatus") || undefined,
          connectedHospitalityResourcesCommentary: formData.get("connectedHospitalityResourcesCommentary") || undefined,
          subcontractorResourcesStatus: formData.get("subcontractorResourcesStatus") || undefined,
          subcontractorResourcesCommentary: formData.get("subcontractorResourcesCommentary") || undefined,
          customerSiteAccessStatus: formData.get("customerSiteAccessStatus") || undefined,
          customerSiteAccessCommentary: formData.get("customerSiteAccessCommentary") || undefined,
          roomAreaAccessStatus: formData.get("roomAreaAccessStatus") || undefined,
          roomAreaAccessCommentary: formData.get("roomAreaAccessCommentary") || undefined,
          permitsRamsInductionsStatus: formData.get("permitsRamsInductionsStatus") || undefined,
          permitsRamsInductionsCommentary: formData.get("permitsRamsInductionsCommentary") || undefined,
          deliveriesStorageStatus: formData.get("deliveriesStorageStatus") || undefined,
          deliveriesStorageCommentary: formData.get("deliveriesStorageCommentary") || undefined,
          operationalImpactRows: parseDelimitedRows(String(formData.get("operationalImpactRows") ?? ""), 4),
          brandComplianceRows: parseDelimitedRows(String(formData.get("brandComplianceRows") ?? ""), 3),
          approvalRows: parseDelimitedRows(String(formData.get("approvalRows") ?? ""), 4),
          distributionRows: parseDelimitedRows(String(formData.get("distributionRows") ?? ""), 3),
          nextWeekPlan: formData.get("nextWeekPlan") || undefined,
          customerActionsRequired: formData.get("customerActionsRequired") || undefined,
          risksBlockers: formData.get("risksBlockers") || undefined,
          budgetSummary: formData.get("budgetSummary") || undefined
        }
      };
      const response = await fetch(`/api/v1/projects/${projectId}/weekly-updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.errors?.[0]?.message ?? "Unable to save weekly update.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Unable to save weekly update.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); void submit(new FormData(event.currentTarget)); }} className="grid gap-3 md:grid-cols-2">
      <label className="text-sm font-medium text-slate-700">Title<input name="title" required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Report number<input name="reportNumber" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Reporting period start<input name="reportingPeriodStart" type="date" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Reporting period end<input name="reportingPeriodEnd" type="date" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Current stage<input name="currentStage" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Status<input name="status" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Executive summary<textarea name="executiveSummary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="md:col-span-2 text-sm font-medium text-slate-700">PM commentary<textarea name="pmCommentary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Overall commentary<textarea name="overallCommentary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Schedule commentary<textarea name="scheduleCommentary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Budget commentary<textarea name="budgetCommentary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Scope commentary<textarea name="scopeCommentary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Risks/issues commentary<textarea name="risksIssuesCommentary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Resources commentary<textarea name="resourcesCommentary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Customer readiness commentary<textarea name="customerReadinessCommentary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Operational impact commentary<textarea name="operationalImpactCommentary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Customer decisions required rows<textarea name="customerDecisionRows" rows={4} placeholder="Decision required | Owner | Required by | Impact if delayed | Status" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Connected Hospitality resources status<input name="connectedHospitalityResourcesStatus" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Connected Hospitality resources commentary<textarea name="connectedHospitalityResourcesCommentary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Subcontractor resources status<input name="subcontractorResourcesStatus" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Subcontractor resources commentary<textarea name="subcontractorResourcesCommentary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Customer site access status<input name="customerSiteAccessStatus" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Customer site access commentary<textarea name="customerSiteAccessCommentary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Room / area access status<input name="roomAreaAccessStatus" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Room / area access commentary<textarea name="roomAreaAccessCommentary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Permits / RAMS / inductions status<input name="permitsRamsInductionsStatus" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Permits / RAMS / inductions commentary<textarea name="permitsRamsInductionsCommentary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-slate-700">Deliveries / storage status<input name="deliveriesStorageStatus" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <label className="text-sm font-medium text-slate-700">Deliveries / storage commentary<textarea name="deliveriesStorageCommentary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Hospitality operational impact rows<textarea name="operationalImpactRows" rows={6} defaultValue={DEFAULT_OPERATIONAL_IMPACT_ROWS} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Brand / compliance rows<textarea name="brandComplianceRows" rows={5} defaultValue={DEFAULT_BRAND_COMPLIANCE_ROWS} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Approval rows<textarea name="approvalRows" rows={4} defaultValue={DEFAULT_APPROVAL_ROWS} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Distribution rows<textarea name="distributionRows" rows={4} defaultValue={DEFAULT_DISTRIBUTION_ROWS} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Risks / blockers<textarea name="risksBlockers" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Budget summary<textarea name="budgetSummary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Customer actions required<textarea name="customerActionsRequired" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Next week plan<textarea name="nextWeekPlan" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      {error ? <p className="md:col-span-2 text-sm text-red-700">{error}</p> : null}
      <div className="md:col-span-2"><Button type="submit" disabled={submitting}>{submitting ? "Saving..." : buttonLabel}</Button></div>
    </form>
  );
}

export function ProjectChangeRequestQuickForm({ projectId, buttonLabel }: { projectId: string; buttonLabel: string }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function submit(formData: FormData) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const title = String(formData.get("title") ?? "").trim();
      const summary = String(formData.get("summary") ?? "").trim();
      const blockers = String(formData.get("blockers") ?? "").trim();
      const response = await fetch(`/api/v1/projects/${projectId}/change-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formType: "change_request",
          title,
          content: {
            summary,
            blockers
          }
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.errors?.[0]?.message ?? "Unable to create change request. Please try again or contact an administrator.");
        return;
      }
      window.location.hash = "change-requests";
      window.location.reload();
    } catch {
      setError("Unable to create change request. Please try again or contact an administrator.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(new FormData(event.currentTarget));
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
      <label className="text-sm font-medium text-slate-700">Title<input name="title" required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>
      <div className="hidden md:block" />
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Summary<textarea name="summary" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="md:col-span-2 text-sm font-medium text-slate-700">Blockers / notes<textarea name="blockers" rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      {error ? <p className="md:col-span-2 text-sm text-red-700">{error}</p> : null}
      <div className="md:col-span-2"><Button type="submit" disabled={submitting}>{submitting ? "Creating..." : buttonLabel}</Button></div>
    </form>
  );
}

export function ProjectTaskTemplateForm() {
  return (
    <QuickJsonForm
      endpoint="/api/v1/projects/task-templates"
      buttonLabel="Create Template"
      fields={[
        { name: "name", label: "Template name", required: true },
        { name: "projectType", label: "Project type", defaultValue: "other", required: true }
      ]}
      fixed={{ isActive: true, items: [] }}
    />
  );
}

type QuickField = { name: string; label: string; type?: "text" | "date" | "number" | "select" | "textarea" | "checkbox"; required?: boolean; options?: Option[]; defaultValue?: string };

function QuickJsonForm({ endpoint, fields, fixed, buttonLabel, method = "POST", errorMessage }: { endpoint: string; fields: QuickField[]; fixed?: Record<string, unknown>; buttonLabel: string; method?: "POST" | "PATCH"; errorMessage?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  async function submit(formData: FormData) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { ...fixed };
      for (const field of fields) body[field.name] = field.type === "checkbox" ? formData.get(field.name) === "on" : formData.get(field.name) || undefined;
      if (fixed?.formType) {
        body.content = Object.fromEntries(Object.entries(body).filter(([key]) => !["formType", "title", "formDate"].includes(key)));
      }
      const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) {
        const responseMessage = payload?.errors?.[0]?.message;
        setError(responseMessage && responseMessage !== "An unexpected error occurred." ? responseMessage : errorMessage ?? "Unable to save.");
        return;
      }
      if (payload?.data?.rescheduleMessage) window.alert(String(payload.data.rescheduleMessage));
      window.location.reload();
    } catch {
      setError(errorMessage ?? "Unable to save.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(new FormData(event.currentTarget));
  }
  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => <QuickInput key={field.name} field={field} />)}
      {error ? <p className="md:col-span-2 text-sm text-red-700">{error}</p> : null}
      <div className="md:col-span-2"><Button type="submit" disabled={submitting}>{submitting ? "Saving..." : buttonLabel}</Button></div>
    </form>
  );
}

function QuickInput({ field }: { field: QuickField }) {
  if (field.type === "checkbox") return <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input name={field.name} type="checkbox" defaultChecked={field.defaultValue === "true"} /> {field.label}</label>;
  if (field.type === "select") return <label className="text-sm font-medium text-slate-700">{field.label}<select name={field.name} required={field.required} defaultValue={field.defaultValue ?? ""} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3"><option value="">Select</option>{field.options?.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>;
  if (field.type === "textarea") return <label className="md:col-span-2 text-sm font-medium text-slate-700">{field.label}<textarea name={field.name} rows={3} defaultValue={field.defaultValue} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>;
  return <label className="text-sm font-medium text-slate-700">{field.label}<input name={field.name} type={field.type ?? "text"} required={field.required} defaultValue={field.defaultValue} step={field.type === "number" ? "0.5" : undefined} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" /></label>;
}

function projectFormFields(formType: string): QuickField[] {
  if (formType === "weekly_update") {
    return [
      { name: "title", label: "Title", required: true },
      { name: "reportingPeriodStart", label: "Reporting period start", type: "date" },
      { name: "reportingPeriodEnd", label: "Reporting period end", type: "date" },
      { name: "reportNumber", label: "Report number" },
      { name: "currentStage", label: "Current stage" },
      { name: "status", label: "Status" },
      { name: "executiveSummary", label: "Executive summary", type: "textarea" },
      { name: "pmSummary", label: "PM written project management summary", type: "textarea" },
      { name: "pmCommentary", label: "Project Manager commentary", type: "textarea" },
      { name: "overallStatus", label: "Overall status" },
      { name: "customerReadinessCommentary", label: "Customer readiness commentary", type: "textarea" },
      { name: "operationalImpactCommentary", label: "Operational impact commentary", type: "textarea" },
      { name: "resourceSiteAccessNotes", label: "Resource / site access notes", type: "textarea" },
      { name: "brandComplianceNotes", label: "Brand / compliance notes", type: "textarea" },
      { name: "customerDecisionsRequired", label: "Customer decisions required", type: "textarea" },
      { name: "approvalDistributionNotes", label: "Approval / distribution notes", type: "textarea" },
      { name: "risksBlockers", label: "Risks / blockers", type: "textarea" },
      { name: "nextWeekPlan", label: "Next week plan", type: "textarea" },
      { name: "customerActionsRequired", label: "Customer actions required", type: "textarea" },
      { name: "resourceDaysUsedThisWeek", label: "Resource days used this week", type: "number" },
      { name: "budgetSummary", label: "Budget summary", type: "textarea" }
    ];
  }
  return [
    { name: "title", label: "Title", required: true },
    { name: "summary", label: "Summary", type: "textarea" },
    { name: "blockers", label: "Blockers / notes", type: "textarea" }
  ];
}

function JsonButton({ endpoint, method, body, label, variant = "primary", confirmMessage }: { endpoint: string; method: "POST" | "PATCH" | "DELETE"; body?: Record<string, unknown>; label: string; variant?: "primary" | "secondary"; confirmMessage?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  async function run() {
    if (submittingRef.current) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    submittingRef.current = true;
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(endpoint, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.errors?.[0]?.message ?? "Action failed.");
        return;
      }
      if (payload?.data?.rescheduleMessage) window.alert(String(payload.data.rescheduleMessage));
      window.location.reload();
    } catch {
      setError("Action failed.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }
  return <div>{error ? <p className="mb-1 text-xs text-red-700">{error}</p> : null}<Button type="button" variant={variant} onClick={run} disabled={submitting}>{submitting ? "Working..." : label}</Button></div>;
}

function ProjectTaskCompleteButton({
  taskId,
  estimatedDays,
  actualDays: existingActualDays
}: {
  taskId: string;
  estimatedDays: number | string | null | undefined;
  actualDays: number | string | null | undefined;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [actualDays, setActualDays] = useState(defaultActualDaysSuggestion(existingActualDays, estimatedDays));
  const submittingRef = useRef(false);

  async function completeTask() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/project-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "complete", actualDays: Number(actualDays) })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.errors?.[0]?.message ?? "Action failed.");
        return;
      }
      if (payload?.data?.rescheduleMessage) window.alert(String(payload.data.rescheduleMessage));
      window.location.reload();
    } catch {
      setError("Action failed.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {promptOpen ? (
        <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
          <label className="block text-xs font-medium text-slate-700">
            Actual days used
            <input
              type="number"
              min="0"
              step="0.5"
              value={actualDays}
              onChange={(event) => setActualDays(event.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <Button type="button" onClick={completeTask} disabled={submitting}>{submitting ? "Completing..." : "Confirm Complete"}</Button>
            <Button type="button" variant="secondary" onClick={() => setPromptOpen(false)} disabled={submitting}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => {
            setActualDays(defaultActualDaysSuggestion(existingActualDays, estimatedDays));
            setPromptOpen(true);
          }}
        >
          Complete
        </Button>
      )}
    </div>
  );
}

export function defaultActualDaysSuggestion(actualDays: number | string | null | undefined, estimatedDays: number | string | null | undefined) {
  const currentActual = Number(actualDays ?? 0);
  if (Number.isFinite(currentActual) && currentActual > 0) return String(currentActual);
  const estimate = Number(estimatedDays ?? 0);
  if (Number.isFinite(estimate) && estimate > 0) return String(estimate);
  return "1";
}

function dateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

const DEFAULT_OPERATIONAL_IMPACT_ROWS = [
  "Guest Rooms |  |  | ",
  "Public Areas |  |  | ",
  "Meeting Rooms / Events |  |  | ",
  "Back of House |  |  | ",
  "Network / System Outage Windows |  |  | ",
  "Guest Experience |  |  | "
].join("\n");

const DEFAULT_BRAND_COMPLIANCE_ROWS = [
  "Brand Standard Compliance |  | ",
  "Customer Technical Standard |  | ",
  "Cybersecurity / Data Protection |  | ",
  "Testing / Commissioning Evidence |  | ",
  "Handover Evidence |  | "
].join("\n");

const DEFAULT_APPROVAL_ROWS = [
  "Project Manager |  | Pending | ",
  "Project Sponsor |  | Pending | ",
  "Customer Representative |  | Pending | "
].join("\n");

const DEFAULT_DISTRIBUTION_ROWS = [
  "Project Manager | Connected Hospitality | Project control and governance",
  "Salesperson | Connected Hospitality | Sales alignment",
  "Customer Representative | Customer | Customer distribution"
].join("\n");

function parseDelimitedRows(value: string, expectedColumns: number) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      while (parts.length < expectedColumns) parts.push("");
      return parts.slice(0, expectedColumns);
    });
}
