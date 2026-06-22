import { Button } from "@/components/ui/button";
import type { SalespersonOption } from "@/modules/crm/sales/salesperson-service";

type SalespersonFilterProps = {
  salespeople: SalespersonOption[];
  selectedSalespersonId?: string | null;
  showAll?: boolean;
  hiddenFields?: Record<string, string | undefined>;
};

export function SalespersonFilter({ salespeople, selectedSalespersonId, showAll = true, hiddenFields = {} }: SalespersonFilterProps) {
  return (
    <form className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3">
      {Object.entries(hiddenFields).map(([name, value]) => value ? <input key={name} type="hidden" name={name} value={value} /> : null)}
      <label className="block text-sm font-medium text-slate-700">
        Salesperson
        <select name="salespersonId" defaultValue={selectedSalespersonId ?? ""} className="mt-1 h-10 min-w-64 rounded-md border border-slate-300 px-3 text-sm">
          {showAll ? <option value="">All</option> : null}
          {salespeople.map((salesperson) => (
            <option key={salesperson.id} value={salesperson.id}>
              {salesperson.displayName} ({salesperson.email})
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" variant="secondary">Apply</Button>
    </form>
  );
}
