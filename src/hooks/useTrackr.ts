import { useState, useCallback } from "react";
import {
  TrackrProgramme,
  TrackrIndustry,
  TrackrType,
  TrackrSeason,
  TrackrRegion,
  buildTrackrUrl,
  getCached,
  setCached,
  formatCacheAge,
} from "../lib/trackr";

// ─── Daily call budget ────────────────────────────────────────────────────────
// Track calls within this browser session to prevent exceeding the secondary
// 10/day rate limit. Reset is approximate (page reload resets counter, but 
// the API itself resets on a 24h rolling window).

const SESSION_CALL_KEY = "trackr_session_calls_date";
const SESSION_COUNT_KEY = "trackr_session_calls_count";
const DAILY_BUDGET = 10;

function getSessionCalls(): number {
  const today = new Date().toISOString().slice(0, 10);
  const storedDate = localStorage.getItem(SESSION_CALL_KEY);
  if (storedDate !== today) {
    localStorage.setItem(SESSION_CALL_KEY, today);
    localStorage.setItem(SESSION_COUNT_KEY, "0");
    return 0;
  }
  return parseInt(localStorage.getItem(SESSION_COUNT_KEY) ?? "0", 10);
}

function incrementSessionCalls(): void {
  const current = getSessionCalls();
  localStorage.setItem(SESSION_COUNT_KEY, String(current + 1));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

type UseTrackrOptions = {
  region?: TrackrRegion;
  industry: TrackrIndustry;
  type: TrackrType;
  season: TrackrSeason;
};

type UseTrackrResult = {
  programmes: TrackrProgramme[];
  loading: boolean;
  error: string | null;
  cacheAge: string | null;
  callsRemaining: number;
  fetch: () => Promise<void>;
};

/**
 * Fetches Trackr programmes for a given industry/type/season combo.
 * - Checks localStorage cache first (24h TTL).
 * - Only hits the API on a cache miss, and tracks the daily call budget.
 * - Returns cached data immediately (no loading flash on subsequent mounts).
 */
export function useTrackr({
  region = "UK",
  industry,
  type,
  season,
}: UseTrackrOptions): UseTrackrResult {
  const cached = getCached(region, industry, type, season);

  const [programmes, setProgrammes] = useState<TrackrProgramme[]>(cached?.data ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheAge, setCacheAge] = useState<string | null>(
    cached ? formatCacheAge(cached.ageMs) : null
  );
  const [callsRemaining, setCallsRemaining] = useState(
    DAILY_BUDGET - getSessionCalls()
  );

  const fetchData = useCallback(async () => {
    // Check cache first
    const fresh = getCached(region, industry, type, season);
    if (fresh) {
      setProgrammes(fresh.data);
      setCacheAge(formatCacheAge(fresh.ageMs));
      setError(null);
      return;
    }

    // Check budget
    const remaining = DAILY_BUDGET - getSessionCalls();
    if (remaining <= 0) {
      setError(
        "Daily API limit reached (10 calls). Cached data will be used where available. Try again tomorrow."
      );
      setCallsRemaining(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = buildTrackrUrl(region, industry, type, season);
      const res = await fetch(url);

      if (!res.ok) {
        if (res.status === 429) {
          setError("Rate limited by Trackr API. Please wait and try again.");
        } else {
          setError(`API error ${res.status}: ${res.statusText}`);
        }
        return;
      }

      const data: TrackrProgramme[] = await res.json();
      setCached(region, industry, type, season, data);
      incrementSessionCalls();

      setProgrammes(data);
      setCacheAge("just now");
      setCallsRemaining(DAILY_BUDGET - getSessionCalls());
    } catch (err) {
      if (err instanceof Error) {
        setError(`Failed to fetch: ${err.message}`);
      } else {
        setError("Unknown error fetching from Trackr API.");
      }
    } finally {
      setLoading(false);
    }
  }, [region, industry, type, season]);

  return {
    programmes,
    loading,
    error,
    cacheAge,
    callsRemaining,
    fetch: fetchData,
  };
}

// ─── Multi-combo fetch hook ────────────────────────────────────────────────────

/**
 * Fetches ALL combos for a given industry (all types) and aggregates results.
 * Used when the user switches to an industry tab for the first time.
 */
export function useTrackrIndustry({
  region = "UK",
  industry,
  types,
  season,
}: {
  region?: TrackrRegion;
  industry: TrackrIndustry;
  types: TrackrType[];
  season: TrackrSeason;
}) {
  const [programmes, setProgrammes] = useState<TrackrProgramme[]>(() => {
    // Eagerly load from cache
    const all: TrackrProgramme[] = [];
    for (const t of types) {
      const c = getCached(region, industry, t, season);
      if (c) all.push(...c.data);
    }
    return all;
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [cacheAges, setCacheAges] = useState<Record<string, string>>(() => {
    const ages: Record<string, string> = {};
    for (const t of types) {
      const c = getCached(region, industry, t, season);
      if (c) ages[t] = formatCacheAge(c.ageMs);
    }
    return ages;
  });

  const fetchMissing = useCallback(async () => {
    const missing = types.filter((t) => !getCached(region, industry, t, season));
    if (missing.length === 0) return;

    const remaining = DAILY_BUDGET - getSessionCalls();
    const canFetch = Math.min(remaining, missing.length);
    const toFetch = missing.slice(0, canFetch);

    const newErrors: string[] = [];

    if (canFetch < missing.length) {
      newErrors.push(
        `Partial data: only ${canFetch} of ${missing.length} type(s) could be fetched today (daily API budget).`
      );
    }

    if (toFetch.length === 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    const results = await Promise.allSettled(
      toFetch.map(async (t) => {
        const url = buildTrackrUrl(region, industry, t, season);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${t}`);
        const data: TrackrProgramme[] = await res.json();
        setCached(region, industry, t, season, data);
        incrementSessionCalls();
        return { type: t, data };
      })
    );

    const all: TrackrProgramme[] = [];
    const newAges: Record<string, string> = { ...cacheAges };

    for (const result of results) {
      if (result.status === "fulfilled") {
        all.push(...result.value.data);
        newAges[result.value.type] = "just now";
      } else {
        newErrors.push(result.reason?.message ?? "Fetch error");
      }
    }

    // Also include previously cached data
    for (const t of types) {
      if (!toFetch.includes(t)) {
        const c = getCached(region, industry, t, season);
        if (c) {
          all.push(...c.data);
          newAges[t] = formatCacheAge(c.ageMs);
        }
      }
    }

    setProgrammes(all);
    setCacheAges(newAges);
    setErrors(newErrors);
    setLoading(false);
  }, [region, industry, types, season, cacheAges]);

  return {
    programmes,
    loading,
    errors,
    cacheAges,
    fetchMissing,
    callsRemaining: DAILY_BUDGET - getSessionCalls(),
  };
}
