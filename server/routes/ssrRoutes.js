import express from "express";
import { renderSSRDashboardHTML } from "../views/ssrDashboard.js";
import redisCache from "../config/redis.js";

const router = express.Router();

router.get("/dashboard", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.setHeader("X-SSR-Engine", "Express-Node-SSR");
  const html = renderSSRDashboardHTML();
  res.send(html);
});

router.get("/chat-summary", async (req, res) => {
  const stats = redisCache.getStats();
  res.setHeader("Content-Type", "text/html");
  res.send(`
    <html>
      <body style="font-family:sans-serif; background:#090d16; color:#e2e8f0; padding:2rem;">
        <h2>Server-Rendered Chat Summary</h2>
        <p>Cache Status: <strong>${stats.mode}</strong></p>
        <p>Cached Keys: <strong>${stats.cachedKeysCount}</strong></p>
      </body>
    </html>
  `);
});

export default router;
