export type BrowserCacheOptions = {
  ttl?: number;
};

type BrowserCacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
};

function canUseBrowserCache() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getBrowserCache<T>(key: string): T | null {
  if (!canUseBrowserCache()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const entry = JSON.parse(raw) as BrowserCacheEntry<T>;
    if (!entry || typeof entry !== "object") {
      window.localStorage.removeItem(key);
      return null;
    }

    const timestamp = typeof entry.timestamp === "number" ? entry.timestamp : 0;
    const ttl = typeof entry.ttl === "number" ? entry.ttl : 0;

    if (!timestamp || !ttl || Date.now() - timestamp > ttl) {
      window.localStorage.removeItem(key);
      return null;
    }

    return entry.data ?? null;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function setBrowserCache<T>(key: string, data: T, options: BrowserCacheOptions = {}) {
  if (!canUseBrowserCache()) {
    return;
  }

  const ttl = options.ttl ?? 5 * 60 * 1000;

  const entry: BrowserCacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl,
  };

  window.localStorage.setItem(key, JSON.stringify(entry));
}

export function removeBrowserCache(key: string) {
  if (!canUseBrowserCache()) {
    return;
  }

  window.localStorage.removeItem(key);
}