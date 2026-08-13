import { useState, useCallback } from "react";
import { supabase } from "../supabase";
import {
  TrackrProgramme,
  TrackrIndustry,
  TrackrType,
  TrackrSeason,
  TrackrRegion,
  buildTrackrUrl,
  trackrCacheKey,
  isCacheFresh,
  formatCacheAge,
} from "../lib/trackr";

type CacheRow = {
  key: string;
  data: TrackrProgramme[];
  fetched_at: string;
};

function mergeByUniqueId(items: TrackrProgramme[]): TrackrProgramme[] {
  const seen = new Set<string>();
  const out: TrackrProgramme[] = [];
  for (const it of items) {
    if (!it.id || seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

/**
 * Loads the shared opportunity pool for an industry/season from Supabase and,
 * when any combo is missing or older than 24h, silently refreshes it using THIS
 * user's IP — so the per-IP 10/day rate limit is spread across different
 * visitors. Rate limiting is invisible to the user: stale data is kept as-is
 * and empty/error responses are ignored.
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
  const [programmes, setProgrammes] = useState<TrackrProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [cacheAge, setCacheAge] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const keys = types.map((t) => trackrCacheKey(region, industry, t, season));

    // 1. Read the shared cache (everyone reads the same pool).
    const { data, error } = await supabase
      .from("trackr_cache")
      .select("key, data, fetched_at")
      .in("key", keys);

    if (error) console.error("Failed to read Trackr cache:", error);

    const rows = (data ?? []) as CacheRow[];
    const byKey = new Map(rows.map((r) => [r.key, r]));

    const cached: TrackrProgramme[] = [];
    const staleTypes: TrackrType[] = [];
    let oldestAge = 0;

    for (const t of types) {
      const key = trackrCacheKey(region, industry, t, season);
      const row = byKey.get(key);
      if (row && isCacheFresh(row.fetched_at)) {
        cached.push(...(row.data ?? []));
        const ageMs = Date.now() - new Date(row.fetched_at).getTime();
        if (!isNaN(ageMs)) oldestAge = Math.max(oldestAge, ageMs);
      } else {
        staleTypes.push(t);
      }
    }

    setProgrammes(cached);
    setCacheAge(oldestAge > 0 ? formatCacheAge(oldestAge) : null);
    setLoading(false);

    if (staleTypes.length === 0) return;

    // 2. Silently refresh stale/missing combos using this user's IP.
    const fetched: TrackrProgramme[] = [];
    for (const t of staleTypes) {
      try {
        const res = await fetch(buildTrackrUrl(region, industry, t, season));
        if (!res.ok) continue;
        const data: TrackrProgramme[] = await res.json();
        if (!Array.isArray(data) || data.length === 0) continue; // rate-limited or no data — stay silent

        const { error: upsertErr } = await supabase.from("trackr_cache").upsert({
          key: trackrCacheKey(region, industry, t, season),
          data,
          fetched_at: new Date().toISOString(),
        });
        if (upsertErr) console.error("Failed to write Trackr cache:", upsertErr);
        else fetched.push(...data);
      } catch {
        // network error — stay silent and keep whatever is cached
      }
    }

    if (fetched.length > 0) {
      setProgrammes((prev) => mergeByUniqueId([...prev, ...fetched]));
      setCacheAge("just now");
    }
  }, [region, industry, types, season]);

  return { programmes, loading, cacheAge, refresh };
}
