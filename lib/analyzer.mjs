import dotenv from "dotenv";
import { OpenAI } from "openai";
import { writeFile } from "fs/promises";
import {
  getReportCachePath,
  readReportFromCache,
  writeReportToCache,
  getImageCachePath,
  readImageFromCache,
  writeImageToCache,
} from "../helpers/cache.mjs";

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in .env");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TEXT_MODEL = process.env.TEXT_MODEL || "gpt-4o-mini";
const IMAGE_MODEL = process.env.IMAGE_MODEL || "gpt-image-1";

export async function parseFlowForReport(flowJsonString) {
  const cacheFile = await getReportCachePath(flowJsonString, TEXT_MODEL);
  const cachedReport = await readReportFromCache(cacheFile);
  if (cachedReport) return cachedReport;

  const sys = `You are a precise analyst. Read Arcade "flow.json" and return STRICT JSON only.`;
  const user = `
  Return JSON with this exact shape (no comments, no markdown fences):
  
  {
    "interactions": ["..."],        // 5-30 human-friendly steps
    "summary": "....",              // 2-4 sentences
    "caption": "....",              // one-sentence social caption with an emoji
    "image_prompt": "...."          // short prompt to generate a professional 1024x1024 social image, no logos
  }
  
  STYLE & RULES
- Derive content ONLY from the provided flow JSON.
- Interactions:
  - 8–12 items, concise, imperative, each capitalized, no trailing periods
  - Use this phrasing exactly when applicable:
    - Focus search:   "Focus the site search"
    - Search query:    "Search for \\"<term>\\""
    - Open product:    "Open \\"<product name>\\""
    - Click actions:   "Click '<Button or Link Text>'"  (use single quotes for labels)
  - Prefer exact button/link text: "Add to cart", "Decline protection plan", "Open cart", "Checkout"
  - Include "Click 'Checkout'" when the flow reaches the cart or presents a checkout action
- Summary: 1–2 sentences, clear and positive
- Caption: 1 sentence, friendly tone, **one emoji max**
- Image prompt: one sentence describing a vibrant, professional 1200x630 social image; **avoid real brand logos**
- Output MUST be valid JSON. No markdown fences, no commentary.

GOOD EXAMPLE (style only)
{
  "interactions": [
    "Focus the site search",
    "Search for \\"scooter\\"",
    "Open \\"Razor A5 Lux Kick Scooter\\"",
    "Select color \\"Blue\\"",
    "Click 'Add to cart'",
    "Click 'Decline protection plan'",
    "Click 'Open cart'",
    "Click 'Checkout'"
  ],
  "summary": "This flow guides users through the process of adding a Razor scooter to their cart on Target.com. It includes steps for searching, selecting, and checking out, ensuring a smooth shopping experience.",
  "caption": "Ready to ride? 🛴 Check out the latest scooters at Target!",
  "image_prompt": "A vibrant and engaging image showcasing a Razor scooter with a shopping cart in a colorful online shopping environment."
}

  YOUR TASK
Apply the same style and constraints to the following flow JSON and return VALID JSON only.

  Flow JSON:
  ---
  ${flowJsonString}
  ---
  `.trim();
  const resp = await openai.responses.create({
    model: TEXT_MODEL,
    input: [{ role: "system", content: sys }, { role: "user", content: user }],
    temperature: 0.2,
  });

  const parsed = JSON.parse(resp.output_text.trim());
  await writeReportToCache(cacheFile, parsed);
  return parsed;
}

export async function generateImageBuffer(imagePrompt) {
  const normalizedPrompt = [
    "Professional 1200x630 social image summarizing an e-commerce user flow.",
    "Avoid real brand logos; use clean UI motifs (search, product card, color swatches, add-to-cart).",
    "Modern, minimal, high-contrast.",
    imagePrompt,
  ].join("\n");

  const cachePath = await getImageCachePath(normalizedPrompt, IMAGE_MODEL, "1024x1024");
  const cached = await readImageFromCache(cachePath);
  if (cached) return cached;

  const img = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt: normalizedPrompt,
    size: "1024x1024",
    n: 1,
  });

  const base64Image = img.data[0].b64_json;
  const buffer = Buffer.from(base64Image, "base64");
  await writeImageToCache(cachePath, buffer);
  return buffer;
}

export async function writeImageToPath(imagePrompt, outPath) {
  const buf = await generateImageBuffer(imagePrompt);
  await writeFile(outPath, buf);
}


