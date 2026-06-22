"use client";

import { ResourceType } from "@prisma/client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type ResourceOption = {
  id: string;
  label: string;
  email?: string | null;
};

type ResourceEditorProps = {
  mode: "create" | "edit";
  endpoint: string;
  successHref: string;
  users: ResourceOption[];
  initialValue?: {
    userId?: string | null;
    resourceType: ResourceType;
    displayName: string;
    companyName?: string | null;
    roleType?: string | null;
    skillTags: string[];
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    agentName?: string | null;
    agentPhone?: string | null;
    agentEmail?: string | null;
    standardDayCost?: number;
    standardDaySell?: number;
    halfDayCost?: number;
    halfDaySell?: number;
    hourlyCost?: number;
    hourlySell?: number;
    active?: boolean;
    notes?: string | null;
  };
};

export function ResourceEditor({ mode, endpoint, successHref, users, initialValue }: ResourceEditorProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resourceType, setResourceType] = useState<ResourceType>(initialValue?.resourceType ?? ResourceType.internal_user);
  const [userId, setUserId] = useState(initialValue?.userId ?? "");
  const [displayName, setDisplayName] = useState(initialValue?.displayName ?? "");
  const [companyName, setCompanyName] = useState(initialValue?.companyName ?? "");
  const [roleType, setRoleType] = useState(initialValue?.roleType ?? "");
  const [skillTags, setSkillTags] = useState(initialValue?.skillTags.join(", ") ?? "");
  const [phone, setPhone] = useState(initialValue?.phone ?? "");
  const [email, setEmail] = useState(initialValue?.email ?? "");
  const [address, setAddress] = useState(initialValue?.address ?? "");
  const [agentName, setAgentName] = useState(initialValue?.agentName ?? "");
  const [agentPhone, setAgentPhone] = useState(initialValue?.agentPhone ?? "");
  const [agentEmail, setAgentEmail] = useState(initialValue?.agentEmail ?? "");
  const [standardDayCost, setStandardDayCost] = useState(String(initialValue?.standardDayCost ?? 0));
  const [standardDaySell, setStandardDaySell] = useState(String(initialValue?.standardDaySell ?? 0));
  const [halfDayCost, setHalfDayCost] = useState(String(initialValue?.halfDayCost ?? 0));
  const [halfDaySell, setHalfDaySell] = useState(String(initialValue?.halfDaySell ?? 0));
  const [hourlyCost, setHourlyCost] = useState(String(initialValue?.hourlyCost ?? 0));
  const [hourlySell, setHourlySell] = useState(String(initialValue?.hourlySell ?? 0));
  const [active, setActive] = useState(initialValue?.active ?? true);
  const [notes, setNotes] = useState(initialValue?.notes ?? "");

  const selectedUser = useMemo(() => users.find((option) => option.id === userId), [userId, users]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId || undefined,
          resourceType,
          displayName,
          companyName: companyName || undefined,
          roleType: roleType || undefined,
          skillTags: skillTags.split(",").map((value) => value.trim()).filter(Boolean),
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          agentName: agentName || undefined,
          agentPhone: agentPhone || undefined,
          agentEmail: agentEmail || undefined,
          standardDayCost,
          standardDaySell,
          halfDayCost,
          halfDaySell,
          hourlyCost,
          hourlySell,
          active,
          notes: notes || undefined
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.errors?.[0]?.message ?? "Unable to save resource.");
        return;
      }
      window.location.href = successHref.replace(":id", payload?.data?.id ?? "");
    } catch {
      setError("Unable to save resource.");
    } finally {
      setSubmitting(false);
    }
  }

  function applySelectedUser(userValue: string) {
    setUserId(userValue);
    const user = users.find((option) => option.id === userValue);
    if (!user) return;
    if (!displayName.trim()) setDisplayName(user.label);
    if (!email.trim() && user.email) setEmail(user.email);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-medium text-slate-700">
        Linked user
        <select value={userId} onChange={(event) => applySelectedUser(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3">
          <option value="">None</option>
          {users.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Resource type
        <select value={resourceType} onChange={(event) => setResourceType(event.target.value as ResourceType)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3">
          {Object.values(ResourceType).map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
        </select>
      </label>
      <InputField label="Display name" value={displayName} onChange={setDisplayName} required />
      <InputField label="Company name" value={companyName} onChange={setCompanyName} />
      <InputField label="Role type" value={roleType} onChange={setRoleType} />
      <InputField label="Skill tags" value={skillTags} onChange={setSkillTags} placeholder="WiFi, IPTV, Survey" />
      <InputField label="Phone" value={phone} onChange={setPhone} />
      <InputField label="Email" value={email} onChange={setEmail} type="email" />
      <TextAreaField label="Address" value={address} onChange={setAddress} />
      <InputField label="Agent name" value={agentName} onChange={setAgentName} />
      <InputField label="Agent phone" value={agentPhone} onChange={setAgentPhone} />
      <InputField label="Agent email" value={agentEmail} onChange={setAgentEmail} type="email" />
      <InputField label="Standard day cost" value={standardDayCost} onChange={setStandardDayCost} type="number" />
      <InputField label="Standard day sell" value={standardDaySell} onChange={setStandardDaySell} type="number" />
      <InputField label="Half day cost" value={halfDayCost} onChange={setHalfDayCost} type="number" />
      <InputField label="Half day sell" value={halfDaySell} onChange={setHalfDaySell} type="number" />
      <InputField label="Hourly cost" value={hourlyCost} onChange={setHourlyCost} type="number" />
      <InputField label="Hourly sell" value={hourlySell} onChange={setHourlySell} type="number" />
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input checked={active} onChange={(event) => setActive(event.target.checked)} type="checkbox" />
        Active resource
      </label>
      <TextAreaField label="Notes" value={notes} onChange={setNotes} />
      {selectedUser?.email ? <p className="md:col-span-2 text-xs text-slate-500">Linked user email: {selectedUser.email}</p> : null}
      {error ? <p className="md:col-span-2 text-sm text-red-700">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : mode === "create" ? "Create Resource" : "Save Changes"}</Button>
      </div>
    </form>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        step={type === "number" ? "0.01" : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3"
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="md:col-span-2 text-sm font-medium text-slate-700">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
    </label>
  );
}
