import express from "express";
import { classifyChunk } from "../services/classifier.js";
import { addClassifiedItem } from "../services/stateManager.js";

const router = express.Router();

export default function transcriptRouter(io) {
  router.post("/", async (req, res) => {
    const { text, speaker, role } = req.body;
    if (!text || !speaker) return res.status(400).json({ error: "text and speaker required" });

    try {
      const classified = await classifyChunk(text, speaker, role || "unknown");
      console.log("Classified result:", JSON.stringify(classified, null, 2));
      if (classified.type !== "irrelevant") {
        const entry = addClassifiedItem({
          type: classified.type,
          text: classified.summary,
          speaker,
          role,
          owner: classified.owner,
          dueBy: classified.dueBy
        });
        io.emit("state_update", { type: classified.type, entry });
      }
      res.json(classified);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "classification failed" });
    }
  });

  return router;
}