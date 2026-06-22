export async function friendlyActionError(response: Response, fallback: string) {
  if (response.status === 401 || response.status === 403) {
    return "You do not have permission to perform this action.";
  }

  return fallback;
}
