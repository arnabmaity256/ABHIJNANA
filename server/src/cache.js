import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const client = createClient({
  url: REDIS_URL,
});

let isConnected = false;

client.on('error', (err) => {
  console.warn(`  [cache] Redis connection error: ${err.message}`);
});

client.on('connect', () => {
  console.log(`  [cache] Connected to Redis at ${REDIS_URL}`);
  isConnected = true;
});

client.on('end', () => {
  isConnected = false;
});

// We connect eagerly, but don't crash if it fails
client.connect().catch((err) => {
  console.warn(`  [cache] Failed to connect to Redis, caching disabled. (${err.message})`);
});

/**
 * Express middleware to cache GET requests.
 * @param {number} ttlSeconds - Time to live in seconds
 */
export function cacheMiddleware(ttlSeconds = 60) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    if (!isConnected) {
      return next();
    }

    const key = `api_cache:${req.originalUrl || req.url}`;
    try {
      const cached = await client.get(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      console.warn(`  [cache] Error reading from Redis: ${err.message}`);
      return next();
    }

    // Override res.json to intercept and cache the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      res.setHeader('X-Cache', 'MISS');
      if (isConnected) {
        client.setEx(key, ttlSeconds, JSON.stringify(body)).catch((err) => {
          console.warn(`  [cache] Error writing to Redis: ${err.message}`);
        });
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Flush all cache entries matching a prefix.
 * e.g. invalidatePrefix('api_cache:/api/records')
 */
export async function invalidatePrefix(prefix) {
  if (!isConnected) return;
  try {
    const keys = await client.keys(`${prefix}*`);
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`  [cache] Invalidated ${keys.length} keys for prefix ${prefix}`);
    }
  } catch (err) {
    console.warn(`  [cache] Error invalidating prefix ${prefix}: ${err.message}`);
  }
}
