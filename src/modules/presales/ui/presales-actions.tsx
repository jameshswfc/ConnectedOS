"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { friendlyActionError } from "@/lib/client-action-errors";
import { presalesStatusDefinitions } from "@/modules/presales/presales-constants";

type Engineer = { id: string; name: string };

export function PresalesAssignForm({ requestId, engineers, currentAssignedToId }: { requestId: string; engineers: Engineer[]; currentAssignedToId?: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function submit(formData: FormData) {
    setError(null);
    const response = await fetch(`/api/v1/presales-requests/${requestId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: formData.get("assignedToId") })
    });
    if (!response.ok) {
      setError(await friendlyActionError(response, "Assignment failed."));
      return;
    }
    router.refresh();
  }
  return (
    <form action={submit} className="flex flex-wrap items-end gap-2">
      <label className="text-sm font-medium text-slate-700">Assign<select name="assignedToId" required defaultValue={currentAssignedToId ?? ""} className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm"><option value="">Select engineer</option>{engineers.map((engineer) => <option key={engineer.id} value={engineer.id}>{engineer.name}</option>)}</select></label>
      <Button type="submit">Assign</Button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}

export function PresalesStatusForm({ requestId, currentStatus }: { requestId: string; currentStatus: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function submit(formData: FormData) {
    setError(null);
    const response = await fetch(`/api/v1/presales-requests/${requestId}/change-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: formData.get("status"), actualHours: formData.get("actualHours") })
    });
    if (!response.ok) {
      setError(await friendlyActionError(response, "Status could not be changed."));
      return;
    }
    router.refresh();
  }
  return (
    <form action={submit} className="flex flex-wrap items-end gap-2">
      <label className="text-sm font-medium text-slate-700">Status<select name="status" required defaultValue={currentStatus} className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm">{presalesStatusDefinitions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">Actual hours<input name="actualHours" type="number" min="0" step="0.25" className="mt-1 h-10 w-28 rounded-md border border-slate-300 px-3 text-sm" /></label>
      <Button type="submit">Update Status</Button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}

export function PresalesTaskForm({ requestId, engineers, disabled }: { requestId: string; engineers: Engineer[]; disabled?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function submit(formData: FormData) {
    setError(null);
    const response = await fetch(`/api/v1/presales-requests/${requestId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: formData.get("title"), description: formData.get("description"), assignedToId: formData.get("assignedToId"), dueDate: formData.get("dueDate") })
    });
    if (!response.ok) {
      setError(await friendlyActionError(response, "Task could not be added."));
      return;
    }
    router.refresh();
  }
  return (
    <form action={submit} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
      <input name="title" required disabled={disabled} placeholder="Task title" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
      <select name="assignedToId" disabled={disabled} className="h-10 rounded-md border border-slate-300 px-3 text-sm"><option value="">Unassigned</option>{engineers.map((engineer) => <option key={engineer.id} value={engineer.id}>{engineer.name}</option>)}</select>
      <input name="dueDate" type="date" disabled={disabled} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
      <input name="description" disabled={disabled} placeholder="Description" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
      <div className="md:col-span-2"><Button type="submit" disabled={disabled}>Add Task</Button>{error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}</div>
    </form>
  );
}

export function PresalesTaskCompleteButton({ taskId, disabled }: { taskId: string; disabled?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function complete() {
    setError(null);
    const response = await fetch(`/api/v1/presales-tasks/${taskId}/complete`, { method: "POST" });
    if (!response.ok) {
      setError(await friendlyActionError(response, "Task could not be completed."));
      return;
    }
    router.refresh();
  }
  return <div className="space-y-1"><Button type="button" variant="secondary" disabled={disabled} onClick={complete}>Complete</Button>{error ? <p className="text-xs text-red-700">{error}</p> : null}</div>;
}

export function PresalesDocumentForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  async function submit(formData: FormData) {
    setError(null);
    setIsUploading(true);
    const response = await fetch(`/api/v1/presales-requests/${requestId}/files`, {
      method: "POST",
      body: formData
    });
    setIsUploading(false);
    if (!response.ok) {
      setError(await friendlyActionError(response, "File upload failed. Check the file type, file name and 25MB limit."));
      return;
    }
    router.refresh();
  }
  return (
    <form action={submit} className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm font-medium text-slate-700">Upload File<input name="files" type="file" multiple accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.csv,.txt" className="mt-1 block text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white" /></label>
        <Button type="submit" disabled={isUploading}>{isUploading ? "Uploading..." : "Upload File"}</Button>
      </div>
      <p className="text-xs text-slate-500">PDF, DOCX, XLSX, PPTX, PNG, JPG, CSV and TXT files up to 25MB. Files are stored locally in development and mapped to a SharePoint target path.</p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}

export function PresalesDeliverableForm({ requestId, deliverableType, title, disabled }: { requestId: string; deliverableType: string; title: string; disabled?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  async function submit(formData: FormData) {
    setError(null);
    setIsUploading(true);
    formData.set("deliverableType", deliverableType);
    formData.set("title", title);
    const response = await fetch(`/api/v1/presales-requests/${requestId}/deliverables`, {
      method: "POST",
      body: formData
    });
    setIsUploading(false);
    if (!response.ok) {
      setError(await friendlyActionError(response, "Deliverable upload failed."));
      return;
    }
    router.refresh();
  }
  return (
    <form action={submit} className="flex flex-wrap items-center gap-2">
      <input name="file" type="file" disabled={disabled || isUploading} required accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.csv,.txt" className="block text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white" />
      <Button type="submit" variant="secondary" disabled={disabled || isUploading}>{isUploading ? "Uploading..." : "Upload / Replace"}</Button>
      {error ? <p className="basis-full text-sm text-red-700">{error}</p> : null}
    </form>
  );
}

export function PresalesDeliverableStatusButton({ deliverableId, status, disabled }: { deliverableId: string; status: "complete" | "open"; disabled?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setError(null);
    const response = await fetch(`/api/v1/presales-deliverables/${deliverableId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      setError(await friendlyActionError(response, "Deliverable status could not be updated."));
      return;
    }
    router.refresh();
  }
  return (
    <div className="space-y-1">
      <Button type="button" variant="secondary" disabled={disabled} onClick={submit}>{status === "complete" ? "Mark Complete" : "Reopen"}</Button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

export function PresalesCommentForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function submit(formData: FormData) {
    setError(null);
    const response = await fetch(`/api/v1/presales-requests/${requestId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: formData.get("body") })
    });
    if (response.ok) router.refresh();
    if (!response.ok) setError(await friendlyActionError(response, "Comment could not be added."));
  }
  return (
    <form action={submit} className="space-y-2">
      <textarea name="body" required placeholder="Add note or comment" className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      <Button type="submit">Add Comment</Button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
