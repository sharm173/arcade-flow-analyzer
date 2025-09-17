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
    
    let cacheFile = await getReportCachePath(flowJsonString, TEXT_MODEL);
    let cachedReport = await readReportFromCache(cacheFile);
    
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
  
    let parsedResponse =  JSON.parse(resp.output_text.trim());
    writeReportToCache(cacheFile, parsedResponse);

    return parsedResponse;
  }

  async function genImage(imagePrompt, outPath) {

    let cacheFilePath = await getImageCachePath(imagePrompt, IMAGE_MODEL, "1024x1024");
    let cachedImage = await readImageFromCache(cacheFilePath);

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
    const flowName = flow?.name || 'Arcade Flow';

    let { interactions, summary, caption, image_prompt } = await parseFlowForReport(flowRaw);

    await ensureDir(OUT_DIR);

    //Image
    const imagePath = path.join(OUT_DIR, "social_image.png");
    await genImage(image_prompt, imagePath);

    //Markdown
    const mdPath = path.join(OUT_DIR, "arcade_flow_report.md");
    const md = buildMarkdown(flowName, interactions, summary, caption);
    await writeFile(mdPath, md, "utf8");

    console.log(`✅ Wrote: ${mdPath}`);
    console.log(`🖼️ Wrote: ${imagePath}`);
  }

  main();