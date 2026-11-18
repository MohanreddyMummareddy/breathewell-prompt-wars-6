// Bounded, per-instance guard. Cross-instance limits belong in the deployment firewall.
export function createRateLimiter({
  limit = 12,
  windowMs = 60000,
  maxEntries = 1000,
  now = Date.now,
} = {}) {
  const clients = new Map();
  return (key) => {
    const time = now();
    for (const [client, entry] of clients) if (entry.reset <= time) clients.delete(client);
    let entry = clients.get(key);
    if (!entry) {
      if (clients.size >= maxEntries)
        return { allowed: false, retryAfter: Math.ceil(windowMs / 1000) };
      entry = { count: 0, reset: time + windowMs };
      clients.set(key, entry);
    }
    entry.count++;
    return {
      allowed: entry.count <= limit,
      retryAfter: Math.max(1, Math.ceil((entry.reset - time) / 1000)),
    };
  };
}
