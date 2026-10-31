import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as accounts } from "@/app/api/v1/accounts/route";
import { GET as quotes } from "@/app/api/v1/quotes/route";
import { GET as projects } from "@/app/api/v1/projects/route";
import { GET as presales } from "@/app/api/v1/presales-requests/route";
import { GET as tickets, POST as createTicket } from "@/app/api/v1/helpdesk/tickets/route";
import { GET as bookings, POST as createBooking } from "@/app/api/v1/resource-bookings/route";
import { GET as users } from "@/app/api/v1/users/route";
import { GET as me } from "@/app/api/v1/me/route";
import { GET as notifications, POST as createNotification } from "@/app/api/v1/notifications/route";
import { POST as markAllRead } from "@/app/api/v1/notifications/mark-all-read/route";
import { POST as markRead } from "@/app/api/v1/notifications/[id]/read/route";
import { handleApiError } from "@/modules/crm/api/crm-api-utils";
import { handleQuotingApiError } from "@/modules/quoting/api/quoting-api-utils";
import { handlePresalesApiError } from "@/modules/presales/api/presales-api-utils";
import { handleProjectApiError } from "@/modules/projects/api/project-api-utils";
import { handleModuleApiError } from "@/modules/operations/api-utils";
import { handleUserApiError } from "@/services/users/user-api-utils";

const { session } = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

const request = new Request("http://localhost/api/v1/test");
const routes = [
  ["accounts", () => accounts(request)],
  ["quotes", () => quotes(request)],
  ["projects", () => projects(request)],
  ["pre-sales", () => presales(request)],
  ["helpdesk", () => tickets()],
  ["bookings", () => bookings(request)],
  ["users", () => users()],
  ["profile", () => me()],
  ["notifications", () => notifications()],
  ["create ticket", () => createTicket(request)],
  ["create booking", () => createBooking(request)],
  ["create notification", () => createNotification(request)],
  ["mark all read", () => markAllRead()],
  ["mark read", () => markRead(request, { params: Promise.resolve({ id: "notification-1" }) })]
] as const;

describe("API authentication boundaries", () => {
  beforeEach(() => session.mockReset());

  it.each(routes)("%s returns JSON 401 when signed out, before reading or changing data", async (_name, invoke) => {
    session.mockResolvedValue(null);
    const response = await invoke();
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("location")).toBeNull();
    expect(await response.json()).toEqual({
      success: false, data: null, errors: [{ code: "UNAUTHENTICATED", message: "Please sign in to continue." }]
    });
  });

  it.each(routes)("%s returns JSON 403 when a password change is required", async (_name, invoke) => {
    session.mockResolvedValue({ user: { id: "user-1", mustChangePassword: true, permissions: [] } });
    const response = await invoke();
    expect(response.status).toBe(403);
    expect((await response.json()).errors[0].code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it.each([handleApiError, handleQuotingApiError, handlePresalesApiError, handleProjectApiError, handleModuleApiError, handleUserApiError])(
    "preserves permission denial as JSON 403",
    async (handler) => {
      const response = handler(new Error("Missing permission: record.update"));
      expect(response.status).toBe(403);
      expect((await response.json()).errors[0].code).toBe("FORBIDDEN");
    }
  );
});
