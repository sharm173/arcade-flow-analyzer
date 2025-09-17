import dotenv from "dotenv";
import { OpenAI } from "openai";
import { readFile, writeFile } from "fs/promises";
import {
  getReportCachePath,
  readReportFromCache,
  writeReportToCache,
  getImageCachePath,
  readImageFromCache,
  writeImageToCache,
  ensureDir,
} from "./helpers/cache.mjs";
import path from "path";

 dotenv.config();

 if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in .env");
    process.exit(1);
  }

 const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

 const TEXT_MODEL = process.env.TEXT_MODEL || "gpt-4o-mini";   // cheap+smart
 const IMAGE_MODEL = process.env.IMAGE_MODEL || "gpt-image-1"; // image gen  

 const [IN_PATH = "flow.json", OUT_DIR = "reports"] = process.argv.slice(2);

async function parseFlowForReport(flowJsonString) {
  const cacheFile = await getReportCachePath(flowJsonString, TEXT_MODEL);
  const cachedReport = await readReportFromCache(cacheFile);

  if (cachedReport) {
    console.log("Using cached report");
    return cachedReport;
  }

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

EXAMPLE

INPUT:
{
  "name": "Ecom demo",
  "steps": [
    { "type": "IMAGE", "pageContext": {"title": "Target — Home"}, "clickContext": {"elementType": "input", "cssSelector": "#search"} },
    { "type": "IMAGE", "pageContext": {"title": "Target — Results"}, "clickContext": {"elementType": "image", "text": "Razor A5 Lux Kick Scooter"} },
    { "type": "IMAGE", "pageContext": {"title": "Razor A5 Lux — Target"}, "clickContext": {"elementType": "button", "text": "Blue"} },
    { "type": "IMAGE", "pageContext": {"title": "Razor A5 Lux — Target"}, "clickContext": {"elementType": "button", "text": "Add to cart"} },
    { "type": "IMAGE", "pageContext": {"title": "Coverage options — Target"}, "clickContext": {"elementType": "button", "text": "Decline protection plan"} },
    { "type": "IMAGE", "pageContext": {"title": "Cart — Target"}, "clickContext": {"elementType": "link", "text": "Open cart"} },
    { "type": "IMAGE", "pageContext": {"title": "Cart — Target"}, "clickContext": {"elementType": "button", "text": "Checkout"} }
  ]
}
OUTPUT:
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

  const parsedResponse = JSON.parse(resp.output_text.trim());
  writeReportToCache(cacheFile, parsedResponse);

  return parsedResponse;
}

async function genImage(imagePrompt, outPath) {
  const cacheFilePath = await getImageCachePath(imagePrompt, IMAGE_MODEL, "1024x1024");
  const cachedImage = await readImageFromCache(cacheFilePath);

  if (cachedImage) {
    console.log("Using cached image");
    await writeFile(outPath, cachedImage);
    return;
  }

  const img = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt: [
      "Professional 1200x630 social image summarizing an e-commerce user flow.",
      "Avoid real brand logos; use clean UI motifs (search, product card, color swatches, add-to-cart).",
      "Modern, minimal, high-contrast.",
      imagePrompt,
    ].join("\n"),
    size: "1024x1024",
    n: 1,
  });

  const base64Image = img.data[0].b64_json;
  const imageBuffer = Buffer.from(base64Image, "base64");

  await writeFile(outPath, imageBuffer);
  await writeImageToCache(cacheFilePath, imageBuffer);
}

function buildMarkdown(flowName, interactions, summary, caption) {
  const lines = [];
  lines.push(`# Arcade Flow Report — ${flowName || "Arcade Flow"}`);
  lines.push(`\n---\n## 1) Human-Readable Interaction Log`);
  interactions.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  lines.push(`\n---\n## 2) Summary of User Intent\n${summary}`);
  lines.push(`\n---\n## 3) Social Media Image\nSaved as \`social_image.png\`.`);
  lines.push(`\n**Suggested caption:**\n> ${caption}`);
  lines.push(`\n---\n## 4) Implementation Notes`);
  lines.push(`- Generated with a single text LLM call and a single image call.`);
  return lines.join("\n");
}

async function main() {
  const flowRaw = await readFile(IN_PATH, "utf8");
  const flow = JSON.parse(flowRaw);
  const flowName = flow?.name || "Arcade Flow";

  const { interactions, summary, caption, image_prompt } = await parseFlowForReport(flowRaw);

  await ensureDir(OUT_DIR);

  // Image
  const imagePath = path.join(OUT_DIR, "social_image.png");
  await genImage(image_prompt, imagePath);

  // Markdown
  const mdPath = path.join(OUT_DIR, "arcade_flow_report.md");
  const md = buildMarkdown(flowName, interactions, summary, caption);
  await writeFile(mdPath, md, "utf8");

  console.log(`✅ Wrote: ${mdPath}`);
  console.log(`🖼️ Wrote: ${imagePath}`);
}

main();