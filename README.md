# Arcade Flow Analyzer

Analyze [Arcade](https://arcade.software) `flow.json` files using OpenAI.  
This tool produces:

- **Interaction Log** – step-by-step actions in plain English  
- **Summary** – a clear description of user intent  
- **Caption** – a one-liner suitable for sharing  
- **Social Media Image** – a 1240×1240 card for Twitter/LinkedIn posts  

You can run it from the **CLI** or through the [Web frontend] (https://flocko-3f126.web.app/).

---

## Repo

**Name:** `arcade-flow-analyzer`  
**Description:** Analyze Arcade `flow.json` recordings with OpenAI. Generate a concise interaction log, human-friendly summary, and a professional social media image in one step (CLI + frontend).

---

## Quick Start (CLI)

1. **Clone repo**
   ```bash
   git clone https://github.com/<yourname>/arcade-flow-analyzer.git
   cd arcade-flow-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up API key**
   Create a `.env` file in the project root:

   ```bash
   echo "OPENAI_API_KEY=sk-..." > .env
   ```

   *(make sure `.env` is in `.gitignore`)*

4. **Run analysis**
   Place a `flow.json` in the project root, then run:

   ```bash
   node index.mjs flow.json reports
   ```

   This will generate:

   - `reports/arcade_flow_report.md`  
   - `reports/social_image.png`

---

## Frontend Usage

The repo also includes a minimal **Next.js app** for a web interface.

1. **Start the dev server**
   ```bash
   npm run dev:api
   ```

2. **Upload a `flow.json`**
   - Go to `https://flocko-3f126.web.app/`  
   - Drag-and-drop or select your `flow.json` file  
   - Click **Analyze**

3. **View results**
   - **Report** rendered in the browser  
   - **Social media image** preview + download button  
   - **Suggested caption** displayed under the image  
