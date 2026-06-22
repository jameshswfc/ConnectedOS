export type AccountScopedOption = {
  id: string;
  label: string;
  accountId: string | null;
};

export function filterAccountScopedOptions<TOption extends AccountScopedOption>(
  options: TOption[],
  accountId: string | null | undefined
) {
  if (!accountId) return [];
  return options.filter((option) => option.accountId === accountId);
}

export function isOptionValidForAccount<TOption extends AccountScopedOption>(
  optionId: string | null | undefined,
  accountId: string | null | undefined,
  options: TOption[]
) {
  if (!optionId) return true;
  if (!accountId) return false;
  return options.some((option) => option.id === optionId && option.accountId === accountId);
}
