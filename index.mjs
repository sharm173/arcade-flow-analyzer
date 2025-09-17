import dotenv from "dotenv";
import { OpenAI } from "openai";
import { readFile, writeFile } from "fs/promises";

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in .env");
    process.exit(1);
  }

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractFile(flowJsonString) {

    
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
      model: "gpt-4o-mini",
      input: [{ role: "system", content: sys }, { role: "user", content: user }],
      temperature: 0.2,
    });
  
    //return JSON.parse(resp.output_text.trim());
    return JSON.parse(resp.output_text.trim());
    console.log({ interactions, summary, caption, image_prompt });
  }

  async function genImage(imagePrompt, outPath) {
    const img = await openai.images.generate({
      model: "gpt-image-1",
      prompt: [
        "Professional 1200x630 social image summarizing an e-commerce user flow.",
        "Avoid real brand logos; use clean UI motifs (search, product card, color swatches, add-to-cart).",
        "Modern, minimal, high-contrast.",
        imagePrompt,
      ].join("\n"),
      size: "1024x1024",
      n: 1,
    });
  
    const b64 = img.data[0].b64_json;
    const buf = Buffer.from(b64, "base64");
    await writeFile(outPath, buf);
  }

  async function main() {
    const flowRaw = await readFile('flow.json', "utf8");
    let { interactions, summary, caption, image_prompt } = await extractFile(flowRaw);
    console.log({ interactions, summary, caption, image_prompt });
    let imagePath = 'social_image.png';
    await genImage(image_prompt, imagePath);
  }

  main();