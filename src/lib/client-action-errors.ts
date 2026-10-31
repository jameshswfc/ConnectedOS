export async function friendlyActionError(response: Response, fallback: string) {
  if (response.status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  if (response.status === 403) {
    const body = await response.clone().json().catch(() => null);
    if (body?.errors?.some((error: { code?: string }) => error.code === "PASSWORD_CHANGE_REQUIRED")) {
      return "Please change your password in Settings before continuing.";
    }
    return "You do not have permission to perform this action.";
  }

  return fallback;
}
