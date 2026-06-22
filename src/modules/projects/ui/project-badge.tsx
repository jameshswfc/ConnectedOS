import { projectLabel, projectStatusClass } from "@/modules/projects/ui/project-format";

export function ProjectBadge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${projectStatusClass(value)}`}>{projectLabel(value)}</span>;
}
