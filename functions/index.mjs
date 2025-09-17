import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import express from "express";
import cors from "cors";
import multer from "multer";
import { parseFlowForReport, generateImageBuffer } from "../lib/analyzer.mjs";

// Set global options
setGlobalOptions({ maxInstances: 10 });

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing file field 'file'" });
    }
    const flowJsonString = req.file.buffer.toString("utf8");
    const report = await parseFlowForReport(flowJsonString);
    const imageBuffer = await generateImageBuffer(report.image_prompt);
    const image_b64 = imageBuffer.toString("base64");
    res.json({ ...report, image_b64 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error", detail: String(err) });
  }
});

export const api = onRequest(app);
