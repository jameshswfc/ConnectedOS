"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

const groups = [
  { label: "Overview", views: ["Overview", "Pre-Sales Handover"] },
  { label: "Delivery", views: ["Tasks", "Milestones", "Schedule", "Calendar", "Gantt", "Resources", "Issues & Actions"] },
  { label: "Commercial", views: ["Budget", "Change Requests"] },
  { label: "Reports & Handover", views: ["Daily Updates", "Weekly Updates", "Implementation Document", "Closure", "Support Handover", "Documents", "Audit"] }
];
export function projectViewId(title: string) { return title.toLowerCase().replaceAll("&", "and").replaceAll(" ", "-"); }
export const projectViews = groups.flatMap((g) => g.views);
export function projectViewFromHash(hash: string) {
  const value = hash.replace(/^#/, "");
  if (["project-stage-gates", "scope-summary"].includes(value)) return "overview";
  return projectViews.some((view) => projectViewId(view) === value) ? value : "overview";
}
const ProjectView = createContext("overview");

export function ProjectWorkspace({ children }: { children: ReactNode }) {
  const [active, setActive] = useState("overview");
  useEffect(() => {
    const update = () => setActive(projectViewFromHash(window.location.hash));
    update(); window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  function choose(value: string) { setActive(value); window.history.replaceState(null, "", `#${value}`); }
  return <ProjectView.Provider value={active}>
    <nav aria-label="Project views" className="mb-5 border-b border-slate-200 pb-4">
      <div className="flex flex-wrap gap-2">{groups.map((group) => {
        const selected = group.views.some((v) => projectViewId(v) === active);
        return <button key={group.label} type="button" aria-pressed={selected} onClick={() => choose(projectViewId(group.views[0]))} className={`min-h-10 rounded px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 ${selected ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{group.label}</button>;
      })}</div>
      <div className="relative mt-3 inline-block max-w-full"><label htmlFor="project-view" className="sr-only">Project section</label><select id="project-view" value={active} onChange={(e) => choose(e.target.value)} className="max-w-full appearance-none rounded border border-slate-300 bg-white py-2 pl-3 pr-10 text-sm">{groups.map((g) => <optgroup key={g.label} label={g.label}>{g.views.map((view) => <option key={view} value={projectViewId(view)}>{view}</option>)}</optgroup>)}</select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-3 h-4 w-4" /></div>
    </nav>
    {children}
  </ProjectView.Provider>;
}

export function ProjectPanel({ name, children }: { name: string; children: ReactNode }) {
  const active = useContext(ProjectView);
  return <div hidden={active !== name} data-project-view={name}>{children}</div>;
}
