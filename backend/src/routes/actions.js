import express from "express";
import { updateActionStatus, getState } from "../services/stateManager.js";
import { postToSlack } from "../services/slack.js";

const router = express.Router();

export default function actionsRouter(io) {
  // propose an action (needs human confirm before executing)
  router.post("/propose", (req, res) => {
    const { description, proposedBy } = req.body;
    io.emit("action_proposed", { description, proposedBy, id: Date.now() });
    res.json({ status: "awaiting_confirmation" });
  });

  // human confirms → actually execute (e.g. post to slack)
  router.post("/confirm", async (req, res) => {
    const { description, confirmedBy } = req.body;
    await postToSlack(`🚨 Incident action confirmed by ${confirmedBy}: ${description}`);
    io.emit("action_executed", { description, confirmedBy });
    res.json({ status: "executed" });
  });

  router.get("/state", (req, res) => {
    res.json(getState());
  });

  router.patch("/:id/status", (req, res) => {
    const updated = updateActionStatus(req.params.id, req.body.status);
    io.emit("state_update", { type: "action_status", entry: updated });
    res.json(updated);
  });

  return router;
}