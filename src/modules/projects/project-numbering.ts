export function formatProjectNumber(year: number, sequence: number) {
  return `PRJ-${year}-${String(sequence).padStart(4, "0")}`;
}
