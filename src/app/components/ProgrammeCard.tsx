import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Check, MapPin, RefreshCw } from "lucide-react";
import { TrackrProgramme, TrackrType, TRACKR_TYPES, TRACKR_INDUSTRY_TYPES, TrackrIndustry } from "../../lib/trackr";
import { getAvatarColor, getDomain } from "./JobCard";

// ─── Type Badge Styles ─────────────────────────────────────────────────────────

const TYPE_STYLES: Record<TrackrType, string> = {
  "summer-internships":    "bg-amber-100/80 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "spring-weeks":          "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "off-cycle-internships": "bg-blue-100/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "industrial-placements": "bg-violet-100/80 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  "vacation-schemes":      "bg-rose-100/80 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  "training-contracts":     "bg-indigo-100/80 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};

function typeLabel(t: TrackrType): string {
  return TRACKR_TYPES.find((x) => x.id === t)?.short ?? t;
}

// ─── Programme Card ────────────────────────────────────────────────────────────

type ProgrammeCardProps = {
  programme: TrackrProgramme;
  isSelected: boolean;
  isAdded: boolean;
  onSelect: () => void;
  onAdd: () => void;
};

export default function ProgrammeCard({
  programme,
  isSelected,
  isAdded,
  onSelect,
  onAdd,
}: ProgrammeCardProps) {
  const [logoError, setLogoError] = useState(false);
  const [adding, setAdding] = useState(false);

  const name = programme.company.name;
  const domain = getDomain(programme.url ?? programme.company.careersSite);

  async function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    if (isAdded || adding) return;
    setAdding(true);
    await onAdd();
    setAdding(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      onClick={onSelect}
      className={`group flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-border/50 last:border-0 ${
        isSelected
          ? "bg-accent/15 border-l-2 border-l-primary"
          : "hover:bg-muted/50 border-l-2 border-l-transparent"
      }`}
    >
      {/* Company logo / avatar */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden ${getAvatarColor(name)}`}
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

      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-tight">{name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {/* Type badge */}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TYPE_STYLES[programme.type]}`}>
            {typeLabel(programme.type)}
          </span>
          {/* Rolling */}
          {programme.rolling && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <RefreshCw className="w-2.5 h-2.5" />Rolling
            </span>
          )}
          {/* Location */}
          {programme.locations?.length > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate max-w-[80px]">
              <MapPin className="w-2.5 h-2.5 shrink-0" />{programme.locations[0]}
            </span>
          )}
        </div>
      </div>

      {/* Add / Added button */}
      <button
        onClick={handleAdd}
        disabled={isAdded || adding}
        className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all active:scale-95 border ${
          isAdded
            ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40 cursor-default"
            : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 focus:opacity-100"
        }`}
      >
        {isAdded ? (
          <><Check className="w-3 h-3" />Added</>
        ) : (
          <><Plus className="w-3 h-3" />Add</>
        )}
      </button>
    </motion.div>
  );
}

// ─── Type Filter Pills ─────────────────────────────────────────────────────────

export function TypeFilterPills({
  industry,
  selectedType,
  onChange,
}: {
  industry: TrackrIndustry;
  selectedType: TrackrType | "all";
  onChange: (t: TrackrType | "all") => void;
}) {
  const types = TRACKR_INDUSTRY_TYPES[industry];

  return (
    <div className="flex gap-1 flex-wrap">
      <button
        onClick={() => onChange("all")}
        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
          selectedType === "all"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        All
      </button>
      {types.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            selectedType === t
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {typeLabel(t)}
        </button>
      ))}
    </div>
  );
}
