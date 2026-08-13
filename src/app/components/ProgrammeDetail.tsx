import { useState } from "react";
import {
  ExternalLink, Plus, Check, MapPin, Calendar, RefreshCw,
  ChevronRight, TrendingUp, FileText, Mail, Globe, Shield,
} from "lucide-react";
import { TrackrProgramme, TrackrType, TRACKR_TYPES, STAGE_LABELS } from "../../lib/trackr";
import { getAvatarColor, getDomain } from "./JobCard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<TrackrType, string> = {
  "summer-internships":    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "spring-weeks":          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "off-cycle-internships": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "industrial-placements": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  "vacation-schemes":      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return iso;
  }
}

function typeName(t: TrackrType) {
  return TRACKR_TYPES.find((x) => x.id === t)?.label ?? t;
}

// ─── Process Flow ─────────────────────────────────────────────────────────────

function ProcessFlow({ stages }: { stages: string[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stages.map((stage, i) => (
        <div key={i} className="flex items-center gap-1">
          <span
            title={STAGE_LABELS[stage] ?? stage}
            className="text-[11px] font-mono px-2 py-1 rounded bg-muted text-foreground border border-border cursor-default"
          >
            {stage}
          </span>
          {i < stages.length - 1 && (
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: {
  icon: typeof MapPin;
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-xs text-foreground flex-1">{value}</span>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function ProgrammeDetailEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileText className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">Select a programme</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
        Click any programme on the left to see full details here.
      </p>
    </div>
  );
}

// ─── Main Detail Panel ────────────────────────────────────────────────────────

type ProgrammeDetailProps = {
  programme: TrackrProgramme;
  isAdded: boolean;
  onAdd: () => Promise<void>;
};

export default function ProgrammeDetail({ programme, isAdded, onAdd }: ProgrammeDetailProps) {
  const [logoError, setLogoError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const name = programme.company.name;
  const domain = getDomain(programme.url ?? programme.company.careersSite);

  async function handleAdd() {
    if (isAdded || adding || justAdded) return;
    setAdding(true);
    await onAdd();
    setAdding(false);
    setJustAdded(true);
  }

  const displayAdded = isAdded || justAdded;

  // Deadline display
  const deadlineDisplay = programme.closingDate
    ? fmtDate(programme.closingDate)
    : programme.lastYearOpening
    ? `~${fmtDate(programme.lastYearOpening)} (est.)`
    : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-start gap-3 mb-3">
          {/* Logo */}
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold shrink-0 overflow-hidden ${getAvatarColor(name)}`}
          >
            {domain && !logoError ? (
              <img
                src={`https://logo.clearbit.com/${domain}`}
                alt={name}
                onError={() => setLogoError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              name[0]?.toUpperCase() ?? "?"
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground leading-tight">{name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{programme.name}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[programme.type]}`}>
                {typeName(programme.type)}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">{programme.season}</span>
              {programme.categories?.slice(0, 2).map((cat) => (
                <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            disabled={displayAdded || adding}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-95 flex-1 justify-center ${
              displayAdded
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40 cursor-default"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            {displayAdded ? (
              <><Check className="w-3.5 h-3.5" />Added to My Jobs</>
            ) : adding ? (
              <span className="animate-pulse">Adding...</span>
            ) : (
              <><Plus className="w-3.5 h-3.5" />Add to My Jobs</>
            )}
          </button>

          {programme.url && (
            <a
              href={programme.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />Apply
            </a>
          )}
        </div>
      </div>

      {/* ── Details ── */}
      <div className="flex-1 px-5 py-4 flex flex-col gap-4">

        {/* Key Info */}
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2" style={{ fontFamily: "'Geist Mono', monospace" }}>
            Key Info
          </p>
          <div>
            {programme.locations?.length > 0 && (
              <InfoRow icon={MapPin} label="Location" value={programme.locations.join(", ")} />
            )}
            {deadlineDisplay && (
              <InfoRow icon={Calendar} label="Closes" value={deadlineDisplay} />
            )}
            {programme.lastYearOpening && !programme.openingDate && (
              <InfoRow icon={Calendar} label="Est. Opens" value={`~${fmtDate(programme.lastYearOpening)} (last year)`} />
            )}
            {programme.openingDate && (
              <InfoRow icon={Calendar} label="Opens" value={fmtDate(programme.openingDate) ?? "—"} />
            )}
            {programme.rolling !== null && programme.rolling !== undefined && (
              <InfoRow icon={RefreshCw} label="Rolling" value={programme.rolling ? "Yes — apply early" : "No"} />
            )}
            {programme.format && (
              <InfoRow icon={Globe} label="Format" value={programme.format} />
            )}
            {programme.eligibility && (
              <InfoRow icon={Shield} label="Eligibility" value={programme.eligibility} />
            )}
            {programme.company.sponsorsVisa && (
              <InfoRow icon={Shield} label="Visa Sponsor" value={programme.company.sponsorsVisa} />
            )}
          </div>
        </section>

        {/* Application Details */}
        {(programme.cv !== null || programme.writtenAnswers || programme.coverLetter) && (
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2" style={{ fontFamily: "'Geist Mono', monospace" }}>
              Application
            </p>
            <div>
              {programme.cv !== null && programme.cv !== undefined && (
                <InfoRow icon={FileText} label="CV Required" value={programme.cv ? "Yes" : "No"} />
              )}
              {programme.writtenAnswers && (
                <InfoRow icon={FileText} label="Written Answers" value={programme.writtenAnswers} />
              )}
              {programme.coverLetter && (
                <InfoRow icon={Mail} label="Cover Letter" value={programme.coverLetter} />
              )}
            </div>
          </section>
        )}

        {/* Process */}
        {programme.process && programme.process.length > 0 && (
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2" style={{ fontFamily: "'Geist Mono', monospace" }}>
              Process
            </p>
            <ProcessFlow stages={programme.process} />
            {/* Stage legend */}
            <div className="mt-2 flex flex-col gap-0.5">
              {programme.process.map((stage) => STAGE_LABELS[stage] && (
                <p key={stage} className="text-[10px] text-muted-foreground font-mono">
                  <span className="text-foreground">{stage}</span> — {STAGE_LABELS[stage]}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* Conversion Rate */}
        {programme.conversionRate && (
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2" style={{ fontFamily: "'Geist Mono', monospace" }}>
              Conversion
            </p>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-700 dark:text-emerald-400">{programme.conversionRate}</p>
            </div>
          </section>
        )}

        {/* Curator Notes */}
        {programme.notes && (
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2" style={{ fontFamily: "'Geist Mono', monospace" }}>
              Curator Notes
            </p>
            <div className="px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                📌 {programme.notes}
              </p>
            </div>
          </section>
        )}

        {/* Acceptance Rate */}
        {programme.acceptanceRate && (
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2" style={{ fontFamily: "'Geist Mono', monospace" }}>
              Acceptance Rate
            </p>
            <p className="text-sm font-semibold text-foreground">{programme.acceptanceRate}</p>
          </section>
        )}

        {/* Company Description */}
        {programme.company.description && (
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2" style={{ fontFamily: "'Geist Mono', monospace" }}>
              About {name}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{programme.company.description}</p>
          </section>
        )}

        {/* External Links */}
        {(programme.company.ukJtpLink || programme.company.careersSite) && (
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2" style={{ fontFamily: "'Geist Mono', monospace" }}>
              Useful Links
            </p>
            <div className="flex flex-col gap-1.5">
              {programme.company.careersSite && (
                <a
                  href={programme.company.careersSite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-primary hover:underline"
                >
                  <Globe className="w-3 h-3 shrink-0" />Careers Site
                </a>
              )}
              {programme.company.ukJtpLink && (
                <a
                  href={programme.company.ukJtpLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  {programme.company.ukJtpName ?? "Interview Prep"}
                </a>
              )}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
