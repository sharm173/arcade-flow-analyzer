import { mkdir, readFile, writeFile } from "fs/promises";
import { createHash } from "crypto";
import path from "path";

export async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

export function hash(input) {
  const h = createHash("sha256");
  h.update(typeof input === "string" ? input : JSON.stringify(input));
  return h.digest("hex");
}

export async function getReportCachePath(flowJsonString, textModel) {
  await ensureDir(".cache");
  const key = hash({ textModel, flowJsonString });
  return path.join(".cache", key + ".json");
}

export async function readReportFromCache(cacheFile) {
  try {
    const cached = await readFile(cacheFile, "utf8");
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

export async function writeReportToCache(cacheFile, parsedResponse) {
  await writeFile(cacheFile, JSON.stringify(parsedResponse, null, 2));
}

export async function getImageCachePath(imagePrompt, imageModel, size = "1024x1024") {
  await ensureDir(".cache");
  const key = hash({ imageModel, imagePrompt, size });
  return path.join(".cache", key + ".png");
}

export async function readImageFromCache(cacheFilePath) {
  try {
    const buf = await readFile(cacheFilePath);
    return buf;
  } catch {
    return null;
  }
}

export async function writeImageToCache(cacheFilePath, imageBuffer) {
  await writeFile(cacheFilePath, imageBuffer);
}


