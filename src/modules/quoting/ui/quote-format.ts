export function formatQuoteMoney(value: unknown) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(Number(value ?? 0));
}

export function formatQuotePercent(value: unknown) {
  return `${Number(value ?? 0).toFixed(2)}%`;
}

export function formatQuoteQuantity(value: unknown) {
  return String(Math.trunc(Number(value ?? 0)));
}

export function labelFromQuoteValue(value: string | null | undefined) {
  if (!value) return "-";
  if (value === "internal_review") return "Awaiting Approval";
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
