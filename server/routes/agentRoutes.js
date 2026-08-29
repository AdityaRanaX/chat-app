import express from "express";
import { runMultiStepAgent } from "../agent/multiStepAgent.js";
import { toolDefinitions } from "../agent/agentTools.js";

const router = express.Router();

router.post("/query", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }
    const agentResult = await runMultiStepAgent(prompt);
    res.json(agentResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tools", (req, res) => {
  res.json({ tools: toolDefinitions });
});

export default router;
