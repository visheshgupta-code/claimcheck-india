function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function createRateLimiter(options = {}) {
  const windowMs = positiveInteger(options.windowMs, 60_000);
  const max = positiveInteger(options.max, 30);
  const now = options.now || Date.now;
  const records = new Map();
  let checks = 0;

  function removeExpired(timestamp) {
    for (const [key, record] of records) {
      if (record.resetAt <= timestamp) records.delete(key);
    }
  }

  return {
    check(key) {
      const timestamp = now();
      let record = records.get(key);

      if (!record || record.resetAt <= timestamp) {
        record = { count: 0, resetAt: timestamp + windowMs };
        records.set(key, record);
      }

      record.count += 1;
      checks += 1;
      if (checks % 250 === 0) removeExpired(timestamp);

      return {
        allowed: record.count <= max,
        limit: max,
        remaining: Math.max(0, max - record.count),
        resetAt: record.resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt - timestamp) / 1000))
      };
    },
    size() {
      return records.size;
    }
  };
}
