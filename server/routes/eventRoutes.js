import express from "express";
import eventBus from "../events/eventBus.js";

const router = express.Router();

// SSE stream for real-time event streaming to client
router.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send historical events first
  const history = eventBus.getHistory().slice(0, 10);
  res.write(`data: ${JSON.stringify({ type: "INIT_HISTORY", history })}\n\n`);

  const onEvent = (eventData) => {
    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
  };

  eventBus.on("event", onEvent);

  req.on("close", () => {
    eventBus.removeListener("event", onEvent);
  });
});

// GET historical event logs
router.get("/history", (req, res) => {
  res.json({
    totalEvents: eventBus.getHistory().length,
    events: eventBus.getHistory(),
  });
});

// POST to publish custom test event
router.get("/publish-sample", (req, res) => {
  const sampleEvent = eventBus.publish("VIVA_DEMO_EVENT", {
    message: "Manual event triggered from API",
    source: "Viva Inspector",
  });
  res.json({ success: true, event: sampleEvent });
});

export default router;
