import dotenv from "dotenv";
import { OpenAI } from "openai";
import { readFile } from "fs/promises";

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in .env");
    process.exit(1);
  }

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractFile() {

    const flowRaw = await readFile('flow.json', "utf8");
    const sys = `You are a precise analyst. Read Arcade "flow.json" and return STRICT JSON only.`;
    const user = `
  Return JSON with this exact shape (no comments, no markdown fences):
  
  {
    "interactions": ["..."],        // 5-30 human-friendly steps
    "summary": "....",              // 2-4 sentences
    "caption": "....",              // one-sentence social caption with an emoji
    "image_prompt": "...."          // short prompt to generate a professional 1200x630 social image, no logos
  }
  
  Flow JSON:
  ---
  ${flowRaw}
  ---
  `.trim();
  
    const resp = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [{ role: "system", content: sys }, { role: "user", content: user }],
      temperature: 0.2,
    });
  
    //return JSON.parse(resp.output_text.trim());
    const { interactions, summary, caption, image_prompt } = await JSON.parse(resp.output_text.trim());
    console.log({ interactions, summary, caption, image_prompt });
  }

  extractFile();