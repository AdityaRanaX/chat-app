import redisCache from "../config/redis.js";

export const cacheMiddleware = (keyGenerator, ttlSeconds = 60) => {
  return async (req, res, next) => {
    try {
      const cacheKey = typeof keyGenerator === "function" ? keyGenerator(req) : keyGenerator || req.originalUrl;
      const cachedData = await redisCache.get(cacheKey);

      if (cachedData) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("X-Cache-Key", cacheKey);
        return res.json(cachedData);
      }

      res.setHeader("X-Cache", "MISS");
      res.setHeader("X-Cache-Key", cacheKey);

      // Intercept res.json to populate cache
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisCache.set(cacheKey, body, ttlSeconds);
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error("[Cache Middleware Error]:", err);
      next();
    }
  };
};

export const invalidateCache = async (keyPattern) => {
  const stats = redisCache.getStats();
  for (const key of stats.cachedKeys) {
    if (key.includes(keyPattern)) {
      await redisCache.del(key);
    }
  }
};
