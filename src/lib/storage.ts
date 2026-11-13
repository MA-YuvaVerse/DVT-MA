import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Storage provider for uploaded documents. Local disk today; a Google Drive
 * provider can implement the same interface later without changing callers.
 */
export interface StorageProvider {
  save(file: File, folderHint: string): Promise<{ storageKey: string; externalUrl?: string }>;
  read(storageKey: string): Promise<Buffer>;
  remove(storageKey: string): Promise<void>;
}

const root = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");

function safePath(key: string) {
  const p = path.resolve(root, key);
  if (!p.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return p;
}

export const localStorageProvider: StorageProvider = {
  async save(file, folderHint) {
    const folder = folderHint.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase() || "misc";
    const ext = path.extname(file.name).replace(/[^.a-z0-9]/gi, "").slice(0, 10);
    const key = `${folder}/${randomUUID()}${ext}`;
    const dest = safePath(key);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, Buffer.from(await file.arrayBuffer()));
    return { storageKey: key };
  },
  async read(key) {
    return readFile(safePath(key));
  },
  async remove(key) {
    await unlink(safePath(key)).catch(() => undefined);
  },
};

export const storage: StorageProvider = localStorageProvider;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
