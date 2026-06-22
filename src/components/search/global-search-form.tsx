export function GlobalSearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/search" className="hidden min-w-[260px] flex-1 lg:block lg:max-w-md">
      <label className="sr-only" htmlFor="global-search">Global search</label>
      <input
        id="global-search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search records, numbers, email, serial or MAC"
        className="h-10 w-full rounded-md border border-brand-100 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-brand-300"
      />
    </form>
  );
}
