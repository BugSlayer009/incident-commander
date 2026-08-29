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

export default router;