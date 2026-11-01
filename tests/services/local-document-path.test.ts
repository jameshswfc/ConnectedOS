import path from "node:path";
import os from "node:os";
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveLocalDocumentPath } from "@/services/documents/local-document-path";

describe("document uploads from persistent deployment storage", () => {
  let directory: string;
  let storage: string;
  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), "document-storage-test-"));
    storage = path.join(directory, "release-storage");
    await mkdir(path.join(directory, "shared", "presales"), { recursive: true });
    await symlink(path.join(directory, "shared"), storage);
    await writeFile(path.join(storage, "presales", "safe.txt"), "test");
  });
  afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
  it("accepts a file through the release storage symlink even if the other allowed directory is absent", async () => {
    const file = path.join(storage, "presales", "safe.txt");
    expect(await resolveLocalDocumentPath(file, storage)).toBe(await realpath(file));
  });
  it("rejects an escaping file symlink", async () => {
    const outside = path.join(directory, "private.txt");
    await writeFile(outside, "private");
    const link = path.join(storage, "presales", "escape.txt");
    await symlink(outside, link);
    await expect(resolveLocalDocumentPath(link, storage)).rejects.toThrow("Invalid local document path");
  });
  it("rejects sibling prefixes and traversal outside allowed storage", async () => {
    await mkdir(path.join(storage, "presales-other"));
    const file = path.join(storage, "presales-other", "other.txt");
    await writeFile(file, "other");
    await expect(resolveLocalDocumentPath(file, storage)).rejects.toThrow("Invalid local document path");
    await expect(resolveLocalDocumentPath(path.join(storage, "presales", "..", "presales-other", "other.txt"), storage)).rejects.toThrow("Invalid local document path");
  });
  it("rejects empty paths and the storage root itself", async () => {
    await expect(resolveLocalDocumentPath("", storage)).rejects.toThrow("Invalid local document path");
    await expect(resolveLocalDocumentPath(path.join(storage, "presales"), storage)).rejects.toThrow("Invalid local document path");
  });
});
