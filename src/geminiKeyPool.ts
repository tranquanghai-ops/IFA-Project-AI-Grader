export const GEMINI_KEY_POOL_STORAGE = "ifa-unified-gemini-api-key-pool-v1";

export type GeminiKeyPool = {
  keys: string[];
  activeIndex: number;
};

const normalizeKeys = (values: unknown): string[] => {
  const input = Array.isArray(values) ? values : [];
  return [0, 1, 2].map(index => String(input[index] || "").trim());
};

export const loadGeminiKeyPool = (legacyKeys: string[] = []): GeminiKeyPool => {
  if (typeof window === "undefined") return { keys: ["", "", ""], activeIndex: 0 };
  try {
    const parsed = JSON.parse(localStorage.getItem(GEMINI_KEY_POOL_STORAGE) || "null");
    if (parsed && Array.isArray(parsed.keys)) {
      const keys = normalizeKeys(parsed.keys);
      const requestedIndex = Math.max(0, Math.min(2, Number(parsed.activeIndex) || 0));
      const activeIndex = keys[requestedIndex] ? requestedIndex : Math.max(0, keys.findIndex(Boolean));
      return { keys, activeIndex };
    }
  } catch (_) {}

  const migrated = normalizeKeys(legacyKeys.filter(Boolean));
  return { keys: migrated, activeIndex: Math.max(0, migrated.findIndex(Boolean)) };
};

export const saveGeminiKeyPool = (keysInput: string[], requestedIndex: number): GeminiKeyPool => {
  const keys = normalizeKeys(keysInput);
  const safeRequestedIndex = Math.max(0, Math.min(2, Number(requestedIndex) || 0));
  const activeIndex = keys[safeRequestedIndex] ? safeRequestedIndex : Math.max(0, keys.findIndex(Boolean));
  const next = { keys, activeIndex };
  if (typeof window !== "undefined") {
    localStorage.setItem(GEMINI_KEY_POOL_STORAGE, JSON.stringify(next));
  }
  return next;
};

export const countGeminiKeys = (pool: GeminiKeyPool): number => pool.keys.filter(Boolean).length;

export const getVisibleGeminiKeySlots = (keys: string[]): number => {
  const lastUsedSlot = keys.reduce((last, value, index) => value ? index + 1 : last, 0);
  return Math.min(3, Math.max(1, lastUsedSlot));
};
