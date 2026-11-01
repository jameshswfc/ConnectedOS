import { describe, expect, it, vi } from "vitest";
import { GraphDocumentClient } from "@/services/documents/graph-document-client";

const config = { tenant: "tenant", client: "client", secret: "test-only", drive: "drive", roots: ["approved-root"] };
const folder = (id: string, parent = "approved-root") => ({ id, name: id, webUrl: `https://example.sharepoint.com/${id}`, folder: {}, eTag: "version-1", parentReference: { id: parent, driveId: "drive" } });
function setup(responses: { status?: number; data: unknown }[]) {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ access_token: "test-token" }));
  for (const response of responses) fetcher.mockResolvedValueOnce(Response.json(response.data, { status: response.status ?? 200 }));
  return { client: new GraphDocumentClient(config, fetcher), fetcher };
}
describe("SharePoint Graph client", () => {
  it("requires the selected folder to descend from an approved root", async () => {
    const { client } = setup([{ data: folder("hotel") }, { data: folder("approved-root") }]);
    await expect(client.assertAllowedFolder("hotel")).resolves.toMatchObject({ id: "hotel" });
  });
  it("rejects folders outside approved roots", async () => {
    const { client } = setup([{ data: { ...folder("other"), parentReference: {} } }]);
    await expect(client.assertAllowedFolder("other")).rejects.toThrow("outside");
  });
  it("recovers a folder-create conflict without renaming or duplicating", async () => {
    const { client, fetcher } = setup([{ data: folder("approved-root") }, { status: 409, data: {} }, { data: folder("record") }]);
    await expect(client.ensureFolder("approved-root", "Record UUID")).resolves.toMatchObject({ id: "record" });
    expect(JSON.parse(fetcher.mock.calls[2][1].body)["@microsoft.graph.conflictBehavior"]).toBe("fail");
    expect(fetcher.mock.calls[3][0]).toContain(encodeURIComponent("Record UUID"));
  });
  it("does not adopt a file as a record folder", async () => {
    const { client } = setup([{ data: folder("approved-root") }, { status: 409, data: {} }, { data: { id: "file", name: "file", webUrl: "https://example.sharepoint.com/file" } }]);
    await expect(client.ensureFolder("approved-root", "record")).rejects.toThrow("occupied by a file");
  });
  it("moves only the known child folder, with an optimistic concurrency guard", async () => {
    const { client, fetcher } = setup([{ data: folder("completed") }, { data: folder("approved-root") }, { data: folder("project", "hotel") }, { data: folder("hotel") }, { data: folder("approved-root") }, { data: folder("project", "completed") }]);
    await expect(client.archiveFolder("project", "hotel", "completed")).resolves.toMatchObject({ id: "project" });
    expect(fetcher.mock.calls.at(-1)?.[1]).toMatchObject({ method: "PATCH", headers: expect.objectContaining({ "If-Match": "version-1" }) });
  });
  it("retries a move already completed without issuing another PATCH", async () => {
    const { client, fetcher } = setup([{ data: folder("completed") }, { data: folder("approved-root") }, { data: folder("project", "completed") }, { data: folder("completed") }, { data: folder("approved-root") }]);
    await expect(client.archiveFolder("project", "hotel", "completed")).resolves.toMatchObject({ id: "project" });
    expect(fetcher.mock.calls.some((call) => call[1]?.method === "PATCH")).toBe(false);
  });
  it("refuses an externally moved project folder instead of moving an unexpected container", async () => {
    const { client } = setup([{ data: folder("completed") }, { data: folder("approved-root") }, { data: folder("project", "other-hotel") }, { data: folder("other-hotel") }, { data: folder("approved-root") }]);
    await expect(client.archiveFolder("project", "hotel", "completed")).rejects.toThrow("Review its location");
  });
  it("does not leak provider bodies or credentials on errors", async () => {
    const { client } = setup([{ status: 403, data: { message: "sensitive provider details" } }]);
    await expect(client.getItem("item")).rejects.toThrow("SharePoint request failed (403)");
  });
});
