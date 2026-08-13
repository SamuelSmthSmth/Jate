import { useState, useEffect, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  RefreshCw, Search, X, Clock, Loader2, Eye, EyeOff,
} from "lucide-react";
import {
  TrackrIndustry, TrackrProgramme, TrackrType,
  TRACKR_INDUSTRIES, TRACKR_INDUSTRY_TYPES, TRACKR_INDUSTRY_SEASONS,
  TrackrSeason, programmeToJob,
} from "../../lib/trackr";
import { useTrackrIndustry } from "../../hooks/useTrackr";
import ProgrammeCard, { TypeFilterPills } from "./ProgrammeCard";
import ProgrammeDetail, { ProgrammeDetailEmpty } from "./ProgrammeDetail";

// ─── Types ────────────────────────────────────────────────────────────────────

type Job = {
  id: string;
  company: string;
  role: string;
  postingUrl?: string;
  [key: string]: unknown;
};

type OpportunitiesTabProps = {
  jobs: Job[];
  addJob: (data: Record<string, unknown>) => Promise<void>;
};

// ─── Season selector ──────────────────────────────────────────────────────────

function SeasonPill({
  season,
  selected,
  onClick,
}: {
  season: TrackrSeason;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
        selected
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
      }`}
    >
      {season}
    </button>
  );
}

// ─── Industry Tab ─────────────────────────────────────────────────────────────

function IndustryTab({
  id,
  label,
  color,
  selected,
  onClick,
}: {
  id: TrackrIndustry;
  label: string;
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        selected
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </button>
  );
}

function ProgrammeSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 border-b border-border/50">
      <div className="w-8 h-8 rounded-lg bg-muted/80 animate-pulse shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="h-3 w-2/3 rounded bg-muted/80 animate-pulse" />
        <div className="h-2.5 w-1/2 rounded bg-muted/80 animate-pulse" />
      </div>
      <div className="w-14 h-6 rounded-md bg-muted/80 animate-pulse shrink-0" />
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export default function OpportunitiesTab({ jobs, addJob }: OpportunitiesTabProps) {
  const [industry, setIndustry] = useState<TrackrIndustry>("Finance");
  const [season, setSeason] = useState<TrackrSeason>(TRACKR_INDUSTRY_SEASONS.Finance[0]);
  const [typeFilter, setTypeFilter] = useState<TrackrType | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hideAdded, setHideAdded] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Track which programmes we've added in this session
  const [sessionAdded, setSessionAdded] = useState<Set<string>>(new Set());

  const types = TRACKR_INDUSTRY_TYPES[industry];

  const { programmes, loading, cacheAge, refresh } = useTrackrIndustry({
    industry,
    types,
    season,
  });

  // Fetch on mount and when industry/season changes
  useEffect(() => {
    refresh();
    setSelectedId(null);
    setTypeFilter("all");
    setMobileShowDetail(false);
  }, [industry, season]);

  // Build a Set of URLs already in My Jobs for "already added" detection
  const addedUrls = useMemo(() => {
    const set = new Set<string>();
    for (const job of jobs) {
      if (job.postingUrl) set.add(job.postingUrl);
    }
    return set;
  }, [jobs]);

  function isAdded(programme: TrackrProgramme): boolean {
    if (sessionAdded.has(programme.id)) return true;
    if (programme.url && addedUrls.has(programme.url)) return true;
    return false;
  }

  // Filter + search (all client-side — zero API calls)
  const filtered = useMemo(() => {
    let list = programmes;
    if (typeFilter !== "all") list = list.filter((p) => p.type === typeFilter);
    if (hideAdded) list = list.filter((p) => !isAdded(p));
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.company.name.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.categories?.some((c) => c.toLowerCase().includes(q)) ||
          p.locations?.some((l) => l.toLowerCase().includes(q))
      );
    }
    // Pinned first, then alphabetical by company
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.company.name.localeCompare(b.company.name);
    });
  }, [programmes, typeFilter, hideAdded, search, sessionAdded, addedUrls]);

  const selected = useMemo(
    () => filtered.find((p) => p.id === selectedId) ?? null,
    [filtered, selectedId]
  );

  async function handleAdd(programme: TrackrProgramme) {
    const jobData = programmeToJob(programme);
    await addJob(jobData);
    setSessionAdded((prev) => new Set(prev).add(programme.id));
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    setMobileShowDetail(true);
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">

      {/* ── Industry tabs ── */}
      <div className="flex items-center border-b border-border px-6 md:px-8 gap-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {TRACKR_INDUSTRIES.map(({ id, label, color }) => (
          <IndustryTab
            key={id}
            id={id}
            label={label}
            color={color}
            selected={industry === id}
            onClick={() => {
              setIndustry(id);
              setSeason(TRACKR_INDUSTRY_SEASONS[id][0]);
            }}
          />
        ))}
        <div className="flex-1" />
        {/* Season selector on the right */}
        <div className="flex items-center gap-1.5 ml-4 py-2 shrink-0">
          {TRACKR_INDUSTRY_SEASONS[industry].map((s) => (
            <SeasonPill key={s} season={s} selected={season === s} onClick={() => setSeason(s)} />
          ))}
        </div>
      </div>

      {/* ── Filters row ── */}
      <div className="px-5 md:px-8 py-3 flex items-center gap-3 border-b border-border flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies, roles, categories…"
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-md border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Type pills */}
        <TypeFilterPills industry={industry} selectedType={typeFilter} onChange={setTypeFilter} />

        {/* Hide Added toggle */}
        <button
          onClick={() => setHideAdded(!hideAdded)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors shrink-0 ${
            hideAdded
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {hideAdded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          Hide Added
        </button>

        {/* Cache info + refresh */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {cacheAge && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
              <Clock className="w-2.5 h-2.5" />{cacheAge}
            </span>
          )}
          <button
            onClick={() => refresh()}
            disabled={loading}
            title="Refresh data"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Results count ── */}
      <div className="px-5 md:px-8 py-2 flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-mono">
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />Fetching…
            </span>
          ) : (
            `${filtered.length} programme${filtered.length !== 1 ? "s" : ""}`
          )}
        </span>
      </div>

      {/* ── Split panel ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: List ── (hidden on mobile when detail is open) */}
        <div className={`flex flex-col border-r border-border overflow-y-auto ${
          mobileShowDetail ? "hidden md:flex" : "flex"
        } w-full md:w-[340px] lg:w-[380px] shrink-0`} style={{ scrollbarWidth: "none" }}>
          <AnimatePresence mode="popLayout">
            {loading && filtered.length === 0 ? (
              <div className="flex flex-col blur-[1px]">
                {Array.from({ length: 7 }).map((_, i) => (
                  <ProgrammeSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-48 text-center px-8"
              >
                <Search className="w-8 h-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground">No programmes found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search ? "Try a different search term." : "No opportunities available right now — check back soon."}
                </p>
              </motion.div>
            ) : (
              filtered.map((programme) => (
                <ProgrammeCard
                  key={programme.id}
                  programme={programme}
                  isSelected={selectedId === programme.id}
                  isAdded={isAdded(programme)}
                  onSelect={() => handleSelect(programme.id)}
                  onAdd={() => handleAdd(programme)}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* ── Right: Detail panel ── */}
        <div className={`flex-1 overflow-hidden ${
          mobileShowDetail ? "flex" : "hidden md:flex"
        } flex-col`}>
          {mobileShowDetail && (
            <div className="md:hidden px-4 py-2 border-b border-border">
              <button
                onClick={() => setMobileShowDetail(false)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                ← Back to list
              </button>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            {selected ? (
              <ProgrammeDetail
                programme={selected}
                isAdded={isAdded(selected)}
                onAdd={() => handleAdd(selected)}
              />
            ) : (
              <ProgrammeDetailEmpty />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
