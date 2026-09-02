import express from "express";
import { generateAgoraToken } from "../agora/tokenGenerator.js";

const router = express.Router();

router.post("/token", (req, res) => {
  const { channelName, uid } = req.body;
  if (!channelName || uid === undefined) {
    return res.status(400).json({ error: "channelName and uid required" });
  }
  const token = generateAgoraToken(channelName, uid);
  res.json({ token, appId: process.env.AGORA_APP_ID });
});
router.post("/start-agent", async (req, res) => {
  const { channelName } = req.body;
  if (!channelName) {
    return res.status(400).json({ error: "channelName is required" });
  }

  try {
    const response = await fetch("https://api.agora.io/api/conversational-ai-agent/v2/projects/" + process.env.AGORA_APP_ID + "/join", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(process.env.AGORA_CUSTOMER_ID + ":" + process.env.AGORA_CUSTOMER_SECRET).toString("base64"),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: channelName,
        pipeline_id: process.env.AGORA_PIPELINE_ID
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to start agent", details: err.message });
  }
});

export default router;
