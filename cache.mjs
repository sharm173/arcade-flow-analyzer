import { mkdir, access, readFile, writeFile } from "fs/promises";
import crypto from "crypto";

export const CACHE_DIR = ".cache";

export async function ensureCacheDir() {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
  } catch {}
}

export function hashString(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readCacheFile(relativePath) {
  await ensureCacheDir();
  const fullPath = `${CACHE_DIR}/${relativePath}`;
  if (!(await fileExists(fullPath))) return null;
  return readFile(fullPath);
}

export async function writeCacheFile(relativePath, data) {
  await ensureCacheDir();
  const fullPath = `${CACHE_DIR}/${relativePath}`;
  return writeFile(fullPath, data);
}

export async function readJSONCache(keyWithExt) {
  const buf = await readCacheFile(keyWithExt);
  if (!buf) return null;
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    return null;
  }
}

export async function writeJSONCache(keyWithExt, obj) {
  const data = JSON.stringify(obj, null, 2);
  await writeCacheFile(keyWithExt, Buffer.from(data, "utf8"));
}

export async function readBinaryCache(keyWithExt) {
  const buf = await readCacheFile(keyWithExt);
  return buf; // Buffer or null
}

export async function writeBinaryCache(keyWithExt, buffer) {
  await writeCacheFile(keyWithExt, buffer);
}


