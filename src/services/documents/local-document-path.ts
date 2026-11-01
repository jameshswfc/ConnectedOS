import path from "node:path";
import { realpath } from "node:fs/promises";

export async function resolveLocalDocumentPath(filePath: string, storageDirectory = "storage") {
  if (!filePath) throw new Error("Invalid local document path");
  const absolute = await realpath(path.resolve(filePath));
  // Deployment storage is a symlink; compare canonical paths on both sides.
  for (const directory of ["sharepoint-fallback", "presales"]) {
    let root: string;
    try {
      root = await realpath(path.resolve(storageDirectory, directory));
    } catch {
      continue;
    }
    const relative = path.relative(root, absolute);
    if (relative && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) return absolute;
  }
  throw new Error("Invalid local document path");
}
