const cache = new Map();

const setCache = (key, data, ttl = 30000) => {
  cache.set(key, {
    data,
    expiry: Date.now() + ttl,
  });
};

const getCache = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiry) {
    cache.delete(key);
    return null;
  }
  return cached.data;
};

module.exports = { setCache, getCache };
