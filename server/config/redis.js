import EventEmitter from "events";

// Smart Redis wrapper with automatic in-memory fallback for local dev
class SmartRedisCache extends EventEmitter {
  constructor() {
    super();
    this.isRedisConnected = false;
    this.redisClient = null;
    this.memoryStore = new Map();
    this.memoryTTL = new Map();
    this.stats = { hits: 0, misses: 0, keysCount: 0 };
    this.initRedis();
  }

  async initRedis() {
    try {
      // Dynamic import so app won't fail if ioredis package isn't installed
      const { default: Redis } = await import("ioredis");
      const host = process.env.REDIS_HOST || "127.0.0.1";
      const port = process.env.REDIS_PORT || 6379;

      this.redisClient = new Redis({
        host,
        port,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: () => null, // don't retry endlessly if Redis server isn't running
      });

      this.redisClient.on("connect", () => {
        this.isRedisConnected = true;
        console.log(`[Redis Cache] Connected to Redis server at ${host}:${port}`);
      });

      this.redisClient.on("error", (err) => {
        if (this.isRedisConnected) {
          console.warn("[Redis Cache] Redis connection lost. Falling back to In-Memory Cache.", err.message);
        }
        this.isRedisConnected = false;
      });

      await this.redisClient.connect();
    } catch (e) {
      this.isRedisConnected = false;
      console.log("[Redis Cache] Running in hybrid In-Memory fallback mode (Redis server offline or omitted).");
    }
  }

  async get(key) {
    if (this.isRedisConnected && this.redisClient) {
      try {
        const data = await this.redisClient.get(key);
        if (data) {
          this.stats.hits++;
          return JSON.parse(data);
        }
      } catch (err) {
        // Fallback on error
      }
    }

    // In-memory lookup
    if (this.memoryStore.has(key)) {
      const expiry = this.memoryTTL.get(key);
      if (expiry && Date.now() > expiry) {
        this.memoryStore.delete(key);
        this.memoryTTL.delete(key);
        this.stats.misses++;
        return null;
      }
      this.stats.hits++;
      return this.memoryStore.get(key);
    }

    this.stats.misses++;
    return null;
  }

  async set(key, value, ttlSeconds = 60) {
    const stringVal = JSON.stringify(value);

    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.set(key, stringVal, "EX", ttlSeconds);
      } catch (err) {}
    }

    // Save in memory store as well
    this.memoryStore.set(key, value);
    if (ttlSeconds > 0) {
      this.memoryTTL.set(key, Date.now() + ttlSeconds * 1000);
    }
    this.stats.keysCount = this.memoryStore.size;
    this.emit("cache_updated", { action: "SET", key });
  }

  async del(key) {
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (err) {}
    }

    this.memoryStore.delete(key);
    this.memoryTTL.delete(key);
    this.stats.keysCount = this.memoryStore.size;
    this.emit("cache_updated", { action: "DEL", key });
  }

  async clear() {
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.flushdb();
      } catch (err) {}
    }
    this.memoryStore.clear();
    this.memoryTTL.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.keysCount = 0;
    this.emit("cache_updated", { action: "CLEAR" });
  }

  getStats() {
    return {
      connectedToRedis: this.isRedisConnected,
      mode: this.isRedisConnected ? "Redis Server" : "In-Memory Fallback Cache",
      hits: this.stats.hits,
      misses: this.stats.misses,
      cachedKeysCount: this.memoryStore.size,
      cachedKeys: Array.from(this.memoryStore.keys()),
    };
  }
}

const redisCache = new SmartRedisCache();
export default redisCache;
