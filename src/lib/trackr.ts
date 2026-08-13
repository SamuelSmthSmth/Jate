// ─── Trackr API Utilities ─────────────────────────────────────────────────────
// All Trackr-related constants, cache helpers, and the programme→job mapper.
// API endpoint: https://api.the-trackr.com/programmes
// Rate limit: 1000/day (main) + 10/day secondary (per IP, unauthenticated)
// Strategy: cache each (region, industry, type, season) combo for 24h.

export const TRACKR_BASE_URL = "https://api.the-trackr.com/programmes";
export const TRACKR_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Filter Options ───────────────────────────────────────────────────────────

export type TrackrIndustry = "Finance" | "Tech" | "Law";
export type TrackrType =
  | "summer-internships"
  | "spring-weeks"
  | "off-cycle-internships"
  | "industrial-placements"
  | "vacation-schemes";
export type TrackrRegion = "UK";
export type TrackrSeason = "2026" | "2027" | "2028";

export const TRACKR_INDUSTRIES: { id: TrackrIndustry; label: string; color: string }[] = [
  { id: "Finance", label: "Finance", color: "#10b981" },
  { id: "Tech",    label: "Technology", color: "#3b82f6" },
  { id: "Law",     label: "Law", color: "#8b5cf6" },
];

export const TRACKR_TYPES: { id: TrackrType; label: string; short: string }[] = [
  { id: "summer-internships",    label: "Summer Internships",    short: "Summer Int." },
  { id: "spring-weeks",          label: "Spring Weeks",          short: "Spring Week" },
  { id: "off-cycle-internships", label: "Off-Cycle Internships", short: "Off-Cycle" },
  { id: "industrial-placements", label: "Industrial Placements", short: "Placement" },
  { id: "vacation-schemes",      label: "Vacation Schemes",      short: "Vac. Scheme" },
];

export const TRACKR_SEASONS: TrackrSeason[] = ["2027", "2028", "2026"];

/** Which types to show per industry (avoids fetching combos that return 0 results) */
export const TRACKR_INDUSTRY_TYPES: Record<TrackrIndustry, TrackrType[]> = {
  Finance: ["summer-internships", "spring-weeks", "off-cycle-internships", "industrial-placements"],
  Tech:    ["summer-internships", "off-cycle-internships", "industrial-placements"],
  Law:     ["vacation-schemes", "summer-internships"],
};

// ─── Programme Shape (from API) ───────────────────────────────────────────────

export type TrackrCompany = {
  id: string;
  name: string;
  description?: string;
  careersSite?: string;
  ukJtpName?: string;
  ukJtpLink?: string;
  ukHousingLocation?: string;
  ukHousingLink?: string;
  sponsorsVisa?: string;
};

export type TrackrProgramme = {
  id: string;
  name: string;
  companyId: string;
  url?: string | null;
  region: string;
  industry: string;
  season: string;
  type: TrackrType;
  categories: string[];
  locations: string[];
  format?: string | null;
  eligibility?: string | null;
  process?: string[] | null;
  openingDate?: string | null;
  closingDate?: string | null;
  lastYearOpening?: string | null;
  eventDate?: string | null;
  currentStage?: string | null;
  rolling?: boolean | null;
  cv?: boolean | null;
  writtenAnswers?: string | null;
  acceptanceRate?: string | null;
  conversionRate?: string | null;
  coverLetter?: string | null;
  notes?: string | null;
  pinned?: boolean;
  company: TrackrCompany;
  status?: unknown;
};

// ─── Cache Helpers ────────────────────────────────────────────────────────────

type CacheEntry = {
  data: TrackrProgramme[];
  timestamp: number;
};

function cacheKey(region: string, industry: string, type: string, season: string): string {
  return `trackr_cache_${region}_${industry}_${type}_${season}`;
}

export function getCached(
  region: string,
  industry: string,
  type: string,
  season: string
): { data: TrackrProgramme[]; ageMs: number } | null {
  try {
    const raw = localStorage.getItem(cacheKey(region, industry, type, season));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    const ageMs = Date.now() - entry.timestamp;
    if (ageMs > TRACKR_CACHE_TTL_MS) return null; // expired
    return { data: entry.data, ageMs };
  } catch {
    return null;
  }
}

export function setCached(
  region: string,
  industry: string,
  type: string,
  season: string,
  data: TrackrProgramme[]
): void {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(cacheKey(region, industry, type, season), JSON.stringify(entry));
  } catch {
    // localStorage quota exceeded — fail silently
  }
}

export function clearCached(region: string, industry: string, type: string, season: string): void {
  localStorage.removeItem(cacheKey(region, industry, type, season));
}

/** Returns age in human-readable form, e.g. "2 hours ago" */
export function formatCacheAge(ageMs: number): string {
  const mins = Math.floor(ageMs / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── URL Builder ──────────────────────────────────────────────────────────────

export function buildTrackrUrl(
  region: TrackrRegion,
  industry: TrackrIndustry,
  type: TrackrType,
  season: TrackrSeason
): string {
  const params = new URLSearchParams({ region, industry, season, type });
  return `${TRACKR_BASE_URL}?${params.toString()}`;
}

// ─── Programme → Jate Job Mapper ─────────────────────────────────────────────

/** Maps a Trackr programme to the shape expected by Jate's addJob(). */
export function programmeToJob(programme: TrackrProgramme): Record<string, unknown> {
  // Prefer actual closing date; fall back to last year's opening as an estimate
  const deadlineEstimated = !programme.closingDate && !!programme.lastYearOpening;
  const deadlineRaw = programme.closingDate ?? programme.lastYearOpening ?? null;
  const deadline = deadlineRaw ? deadlineRaw.slice(0, 10) : "";

  const noteParts: string[] = [];
  if (programme.notes) noteParts.push(`📌 ${programme.notes}`);
  if (deadlineEstimated) noteParts.push("⚠️ Deadline estimated from last year's opening.");
  if (programme.conversionRate) noteParts.push(`🔄 Conversion: ${programme.conversionRate}`);
  if (programme.process?.length) noteParts.push(`📋 Process: ${programme.process.join(" → ")}`);

  return {
    company:    programme.company.name,
    role:       programme.name,
    status:     "Not Applied",
    postingUrl: programme.url ?? undefined,
    deadline,
    notes:      noteParts.join("\n\n") || undefined,
    location:   programme.locations?.join(", ") || undefined,
    // Store the Trackr programme ID so we can detect "already added" later
    trackrId:   programme.id,
    trackrType: programme.type,
  };
}

// ─── Process Stage Abbreviation Labels ───────────────────────────────────────

export const STAGE_LABELS: Record<string, string> = {
  OA:   "Online Assessment",
  CV:   "CV Screen",
  CS:   "Case Study",
  HV:   "HireVue",
  INT:  "Interview",
  AC:   "Assessment Centre",
  TP:   "Technical Phone Screen",
  TC:   "Technical Challenge",
  GD:   "Group Discussion",
  REF:  "References",
  OFFER:"Offer",
};
