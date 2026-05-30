// In-memory cache with TTL — acts as a Redis drop-in fallback.
// When Redis is configured, all reads/writes go through it.
// When Redis is unavailable (or not configured), this map is used instead.

let redis = null;
const memCache = new Map(); // { key: { value, expiresAt } }

// Attempt Redis connection only if REDIS_URL is set
if (process.env.REDIS_URL) {
  try {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, connectTimeout: 3000 });
    redis.on('error', (err) => {
      console.warn(`[cache] Redis error — falling back to memory cache: ${err.message}`);
      redis = null;
    });
    redis.connect()
      .then(() => console.log('[cache] Connected to Upstash Redis! 🚀'))
      .catch((err) => { 
        console.warn(`[cache] Initial Redis connection failed: ${err.message}`);
        redis = null; 
      });
  } catch {
    console.warn('[cache] ioredis not available — using memory cache');
  }
}

const get = async (key) => {
  if (redis) {
    const raw = await redis.get(key).catch(() => null);
    return raw ? JSON.parse(raw) : null;
  }
  const entry = memCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    memCache.delete(key);
    return null;
  }
  return entry.value;
};

const set = async (key, value, ttlSeconds = 60) => {
  if (redis) {
    await redis.setex(key, ttlSeconds, JSON.stringify(value)).catch(() => {});
    return;
  }
  memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
};

const del = async (key) => {
  if (redis) await redis.del(key).catch(() => {});
  memCache.delete(key);
};

module.exports = { get, set, del };
