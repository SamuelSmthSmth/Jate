import { useState, forwardRef, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useThemeSettings } from "../../hooks/useThemeSettings";
import { toPng } from 'html-to-image';

import {
  MapPin, Calendar, Clock, ChevronDown, ChevronUp, Save, Trash2, Archive, RefreshCw, FolderOutput, Share2, Copy, Image as ImageIcon
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "Waiting" | "Applied" | "Assessment" | "Interviewing" | "Rejected" | "Offer";
type SalaryType = "Paid" | "Volunteer";

type Job = {
  id: string;
  company: string;
  role: string;
  status: Status;
  deadline?: string;
  location?: string;
  notes?: string;
  appliedDate?: string;
  postingUrl?: string;
  portalUrl?: string;
  salary?: string;
  salaryType?: SalaryType;
  interviewDate?: string;
  title?: string;
  isPaid?: boolean;
  deadlines?: { signup?: string; interview?: string };
  url?: string;
  [key: string]: unknown;
};

type EditState = {
  status: Status;
  deadline: string;
  appliedDate: string;
  interviewDate: string;
  postingUrl: string;
  portalUrl: string;
  salary: string;
  salaryType: SalaryType;
  notes: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES: Status[] = ["Applied", "Waiting", "Assessment", "Interviewing", "Offer", "Rejected"];

const statusStyles: Record<Status, string> = {
  Applied:      "bg-white text-amber-600 border border-amber-200 dark:bg-transparent dark:text-amber-400 dark:border-amber-800/50",
  Waiting:      "bg-white text-gray-400 border border-dashed border-gray-300 dark:bg-transparent dark:text-gray-500 dark:border-gray-700",
  Assessment:   "bg-white text-violet-600 border border-violet-200 dark:bg-transparent dark:text-violet-400 dark:border-violet-800/50",
  Interviewing: "bg-white text-primary border border-primary/20 dark:bg-transparent dark:text-primary dark:border-primary/20",
  Rejected:     "bg-white text-red-500 border border-red-200 dark:bg-transparent dark:text-red-400 dark:border-red-800/50",
  Offer:        "bg-white text-green-600 border border-green-200 dark:bg-transparent dark:text-green-400 dark:border-green-800/50",
};

const avatarColors: Record<string, string> = {
  A: "bg-orange-100 text-orange-700",
  B: "bg-sky-100 text-sky-700",
  C: "bg-cyan-100 text-cyan-700",
  D: "bg-emerald-100 text-emerald-700",
  E: "bg-lime-100 text-lime-700",
  F: "bg-pink-100 text-pink-700",
  G: "bg-blue-100 text-blue-700",
  H: "bg-amber-100 text-amber-700",
  I: "bg-indigo-100 text-indigo-700",
  J: "bg-rose-100 text-rose-700",
  K: "bg-teal-100 text-teal-700",
  L: "bg-emerald-100 text-emerald-700",
  M: "bg-rose-100 text-rose-700",
  N: "bg-indigo-100 text-indigo-700",
  O: "bg-orange-100 text-orange-700",
  P: "bg-purple-100 text-purple-700",
  Q: "bg-sky-100 text-sky-700",
  R: "bg-red-100 text-red-700",
  S: "bg-violet-100 text-violet-700",
  T: "bg-teal-100 text-teal-700",
  U: "bg-blue-100 text-blue-700",
  V: "bg-violet-100 text-violet-700",
  W: "bg-amber-100 text-amber-700",
  X: "bg-gray-100 text-gray-700",
  Y: "bg-yellow-100 text-yellow-700",
  Z: "bg-zinc-100 text-zinc-700",
};

function getDomain(url?: string) {
  if (!url) return null;
  try {
    let raw = url;
    if (!raw.startsWith("http")) raw = "https://" + raw;
    const { hostname } = new URL(raw);
    return hostname;
  } catch {
    return null;
  }
}

function getAvatarColor(name: string) {
  return avatarColors[(name?.[0] ?? "A").toUpperCase()] ?? "bg-gray-100 text-gray-600";
}

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3"
       style={{ fontFamily: "'Geist Mono', monospace" }}>
      {children}
    </p>
  );
}

function FieldInput({ label, value, onChange, type = "text", placeholder, disabled = false }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        className="px-3 py-2 rounded-md border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        style={type === "date" ? { fontFamily: "'Geist Mono', monospace" } : undefined} />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────


function hexToRgb(hex: string) {
  if (!hex) return '59, 130, 246'; // default blue
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

const JobCard = forwardRef<HTMLDivElement, {
  job: Job;
  updateJob?: (id: string, data: Record<string, unknown>) => Promise<void>;
  deleteJob?: (id: string) => Promise<void>;
  isLast?: boolean;
  readOnly?: boolean;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  isGridView?: boolean;
}>(({
  job,
  updateJob,
  deleteJob,
  isLast = false,
  readOnly = false,
  isGridView = false,
}, ref) => {
  const { density, statusColors } = useThemeSettings();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleExpand() {
    if (isExpanded) { setIsExpanded(false); return; }
    setIsExpanded(true);
    if (!edit) {
      setEdit({
        status: (job.status as Status) ?? "Applied",
        deadline: job.deadline ?? job.deadlines?.signup ?? "",
        appliedDate: job.appliedDate ?? "",
        interviewDate: job.interviewDate ?? job.deadlines?.interview ?? "",
        postingUrl: job.postingUrl ?? job.url ?? "",
        portalUrl: job.portalUrl ?? "",
        salary: job.salary ?? "",
        salaryType: job.salaryType ?? (job.isPaid ? "Paid" : "Volunteer"),
        notes: job.notes ?? "",
      });
    }
  }

  function upd(field: Partial<EditState>) {
    if (readOnly) return;
    setEdit((prev) => prev ? { ...prev, ...field } : prev);
  }

  async function handleSave() {
    if (!edit || !updateJob) return;

    if (edit.status === "Offer" && job.status !== "Offer") {
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-hex').trim() || '#3b82f6';
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: [primaryColor, '#10b981', '#f59e0b']
        });
    }

    await updateJob(job.id, {
      status: edit.status,
      deadline: edit.deadline || null,
      appliedDate: edit.appliedDate || null,
      interviewDate: edit.interviewDate || null,
      postingUrl: edit.postingUrl || null,
      portalUrl: edit.portalUrl || null,
      salary: edit.salary || null,
      salaryType: edit.salaryType,
      notes: edit.notes || null,
      isPaid: edit.salaryType === "Paid",
      url: edit.postingUrl || null,
    });
  }

  async function handleDeleteConfirm() {
    if (deleteJob) await deleteJob(job.id);
  }

  const displayStatus = (isExpanded && edit ? edit.status : job.status) as Status;
  const handleSingleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let txt = `🏢 ${job.company} - ${job.role || job.title || "No Role"}\n📍 ${job.location || "Remote"}`;
    if (job.deadline || job.deadlines?.signup) {
      txt += `\n⏳ Due: ${new Date(job.deadline || job.deadlines?.signup || "").toLocaleDateString()}`;
    }
    if (job.url || job.postingUrl) {
      txt += `\n🔗 ${job.url || job.postingUrl}`;
    }
    const shareText = `Check out this role:\n\n${txt}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check out this role', text: shareText });
      } catch (err) {
        console.error("Share failed", err);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Job copied to clipboard!");
    }
  };

  const handleShareText = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Job: ${companyStr} - ${roleStr}\nStatus: ${displayStatus}\nDue: ${fmt(deadlineStr) || "N/A"}\nLocation: ${job.location || "N/A"}\nURL: ${job.postingUrl || job.url || "N/A"}`;
    navigator.clipboard.writeText(text);
  };

  const handleShareImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, backgroundColor: '#111' });
      
      // Try to write to clipboard as an image
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
      } catch (err) {
        // Fallback to download
        const link = document.createElement('a');
        link.download = `job-card-${companyStr.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Failed to generate image', err);
    }
  };

  const ShareMenu = (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-95 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 border border-transparent hover:border-border">
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" className="z-50 min-w-[140px] bg-popover rounded-md border border-border shadow-md p-1 animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2">
          <DropdownMenu.Item onClick={handleShareText} className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm cursor-pointer outline-none">
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />Copy Text
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={handleShareImage} className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm cursor-pointer outline-none">
            <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />Share Image
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );

  const companyStr = job.company || "Unknown";
  const roleStr = job.role || job.title || "No Role";
  const deadlineStr = job.deadline || job.deadlines?.signup;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, height: 0 }}
      transition={{ duration: 0.2 }}
      className={isGridView ? "h-full" : (isLast ? "" : "border-b border-border")}
    >
      {/* ── Collapsed row / Grid Tile ── */}
      {isGridView ? (
        <div
          onClick={handleExpand}
          ref={cardRef}
          className={`flex flex-col h-full transition-colors cursor-pointer rounded-xl border border-border p-5 relative group ${
            isExpanded ? "bg-[#fcfcfc] dark:bg-accent/10" : "bg-card hover:bg-secondary/40"
          }`}
        >
          {/* Top: Avatar and Titles */}
          <div className="absolute top-3 right-3">{ShareMenu}</div>
          <div className="flex items-start gap-3 mb-4 pr-6">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 mt-0.5 overflow-hidden ${getAvatarColor(companyStr)}`}>
              {(() => {
                const domain = getDomain(job.url || job.postingUrl || job.portalUrl);
                if (domain && !logoError) {
                  return (
                    <img 
                      src={`https://logo.clearbit.com/${domain}`} 
                      alt={companyStr}
                      onError={() => setLogoError(true)}
                      className="w-full h-full object-cover"
                    />
                  );
                }
                return companyStr[0].toUpperCase();
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-foreground truncate">{companyStr}</p>
              <p className="text-[13px] text-muted-foreground truncate mt-0.5">{roleStr}</p>
            </div>
          </div>

          {/* Middle: Dates and Location */}
          <div className="flex flex-col gap-2 flex-1 mb-5">
            {job.location && (
              <span className="flex items-center gap-2 text-[11px] text-muted-foreground"
                style={{ fontFamily: "'Geist Mono', monospace" }}>
                <MapPin className="w-3.5 h-3.5 text-muted-foreground/70" />{job.location}
              </span>
            )}
            {deadlineStr && (
              <span className="flex items-center gap-2 text-[11px] text-muted-foreground"
                style={{ fontFamily: "'Geist Mono', monospace" }}>
                <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />Due {fmt(deadlineStr)}
              </span>
            )}
            {job.appliedDate && (
              <span className="flex items-center gap-2 text-[11px] text-muted-foreground"
                style={{ fontFamily: "'Geist Mono', monospace" }}>
                <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />Applied {fmt(job.appliedDate)}
              </span>
            )}
          </div>

          {/* Bottom Right: Status Badge */}
          <div className="flex items-center justify-between mt-auto">
            {ShareMenu}
            <div className="text-muted-foreground/50 w-4 h-4 flex items-center justify-center group-hover:opacity-100 opacity-50">
              {isExpanded
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 opacity-0 transition-opacity" />}
            </div>
            <span
              className={`text-[11px] px-2.5 py-1 rounded-md font-medium border`}
              style={{ 
                fontFamily: "'Geist Mono', monospace", 
                backgroundColor: `rgba(${hexToRgb(statusColors[displayStatus])}, 0.15)`,
                color: `rgb(${hexToRgb(statusColors[displayStatus])})`,
                borderColor: `rgba(${hexToRgb(statusColors[displayStatus])}, 0.3)`
              }}
            >
              {displayStatus}
            </span>
          </div>
        </div>
      ) : (
        <div
          onClick={handleExpand}
          ref={cardRef}
          className={`group flex items-start transition-colors cursor-pointer relative ${density === 'compact' ? 'gap-3 px-3 py-2' : 'gap-4 px-5 py-4'} ${
            isExpanded ? "bg-[#fcfcfc] dark:bg-accent/10" : "bg-card hover:bg-secondary/40"
          }`}
        >

        {/* Avatar */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 mt-0.5 overflow-hidden ${getAvatarColor(companyStr)}`}>
          {(() => {
            const domain = getDomain(job.url || job.postingUrl || job.portalUrl);
            if (domain && !logoError) {
              return (
                <img 
                  src={`https://logo.clearbit.com/${domain}`} 
                  alt={companyStr}
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-cover"
                />
              );
            }
            return companyStr[0].toUpperCase();
          })()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-foreground truncate">{companyStr}</p>
          <p className="text-[13px] text-muted-foreground truncate mt-0.5">{roleStr}</p>

          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 mt-2.5">
            {job.location && (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                style={{ fontFamily: "'Geist Mono', monospace" }}>
                <MapPin className="w-3 h-3 text-muted-foreground/70" />{job.location}
              </span>
            )}
            {deadlineStr && (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                style={{ fontFamily: "'Geist Mono', monospace" }}>
                <Calendar className="w-3 h-3 text-muted-foreground/70" />Due {fmt(deadlineStr)}
              </span>
            )}
            {job.appliedDate && (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                style={{ fontFamily: "'Geist Mono', monospace" }}>
                <Clock className="w-3 h-3 text-muted-foreground/70" />Applied {fmt(job.appliedDate)}
              </span>
            )}
          </div>
        </div>

        {/* Badge & Chevron */}
        <div className="flex items-center gap-4 shrink-0 mt-1">
          <span
            className={`text-[11px] px-2.5 py-1 rounded-md font-medium border`}
            style={{ 
              fontFamily: "'Geist Mono', monospace", 
              backgroundColor: `rgba(${hexToRgb(statusColors[displayStatus])}, 0.15)`,
              color: `rgb(${hexToRgb(statusColors[displayStatus])})`,
              borderColor: `rgba(${hexToRgb(statusColors[displayStatus])}, 0.3)`
            }}
          >
            {displayStatus}
          </span>
          {ShareMenu}
            <div className="text-muted-foreground/50 w-4 h-4 flex items-center justify-center group-hover:opacity-100 opacity-50">
            {isExpanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
          </div>
        </div>

        </div>
      )}
      {/* ── Accordion ── */}
      <AnimatePresence>
        {isExpanded && edit && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div className={`${density === "compact" ? "px-3 pb-4 pt-2" : "px-5 pb-6 pt-4"} ${isGridView ? "rounded-b-xl border-x border-b -mt-1" : ""} bg-[#fcfcfc] dark:bg-muted/10 border-t border-border`}>
              <div className={`${isGridView ? "" : (density === "compact" ? "ml-[44px]" : "ml-[56px]")} gap-4 flex flex-col`}>

                {/* Status */}
                <div>
                  <SectionLabel>Status</SectionLabel>
                  <select value={edit.status} onChange={(e) => upd({ status: e.target.value as Status })} disabled={readOnly}
                    className="w-48 px-3 py-1.5 rounded-md border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Dates */}
                <div>
                  <SectionLabel>Dates</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldInput label="Due Date" type="date" value={edit.deadline} disabled={readOnly}
                      onChange={(v) => upd({ deadline: v })} />
                    <FieldInput label="Applied Date" type="date" value={edit.appliedDate} disabled={readOnly}
                      onChange={(v) => upd({ appliedDate: v })} />
                    {edit.status === "Interviewing" && (
                      <div className="col-span-2">
                        <FieldInput label="Interview Date (Scheduling)" type="date" disabled={readOnly}
                          value={edit.interviewDate} onChange={(v) => upd({ interviewDate: v })} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Links */}
                <div>
                  <SectionLabel>Links</SectionLabel>
                  <div className="flex flex-col gap-3">
                    <FieldInput label="Posting URL" value={edit.postingUrl} disabled={readOnly}
                      onChange={(v) => upd({ postingUrl: v })} placeholder="company.com/jobs/role" />
                    <FieldInput label="Application Portal URL" value={edit.portalUrl} disabled={readOnly}
                      onChange={(v) => upd({ portalUrl: v })} placeholder="jobs.lever.co/company/apply" />
                  </div>
                </div>

                {/* Compensation */}
                <div>
                  <SectionLabel>Compensation</SectionLabel>
                  <div className="flex items-center gap-1 mb-3 p-1 bg-zinc-100 dark:bg-muted rounded-lg w-fit border border-border/50">
                    {(["Paid", "Volunteer"] as SalaryType[]).map((type) => (
                      <button key={type} onClick={() => upd({ salaryType: type })} disabled={readOnly}
                        className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                          edit.salaryType === type
                            ? "bg-white text-foreground shadow-sm dark:bg-card"
                            : "text-muted-foreground hover:text-foreground"
                        } ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}>
                        {type}
                      </button>
                    ))}
                  </div>
                  {edit.salaryType === "Paid" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium text-foreground">Salary Amount</label>
                      <div className="flex items-center">
                        <span className="px-3 py-2 text-sm text-muted-foreground border border-r-0 border-border bg-muted rounded-l-md font-medium">£</span>
                        <input type="text" value={edit.salary} disabled={readOnly}
                          onChange={(e) => upd({ salary: e.target.value })}
                          placeholder="0"
                          className="flex-1 px-3 py-2 border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                          style={{ fontFamily: "'Geist Mono', monospace" }} />
                        <span className="px-3 py-2 text-xs text-muted-foreground border border-l-0 border-border bg-muted rounded-r-md whitespace-nowrap">/ year</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <SectionLabel>Notes</SectionLabel>
                  <textarea value={edit.notes} onChange={(e) => upd({ notes: e.target.value })} disabled={readOnly}
                    placeholder="Add notes about this application..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-md border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring resize-none leading-relaxed disabled:opacity-50" />
                </div>

                {/* Actions */}
                {!readOnly && (
                  <div className="flex flex-col gap-3 pt-2 mt-2">
                    {showDeleteConfirm ? (
                      <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-100 dark:border-red-900/30">
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">Are you sure you want to delete this job?</span>
                        <div className="flex gap-2 ml-auto">
                          <button onClick={() => setShowDeleteConfirm(false)}
                            className="px-3 py-1.5 rounded-md bg-white dark:bg-card border border-border text-xs font-medium text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-200 ease-in-out">
                            Cancel
                          </button>
                          <button onClick={handleDeleteConfirm}
                            className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors">
                            Yes, Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button onClick={handleSave}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all duration-200 ease-in-out">
                          <Save className="w-3.5 h-3.5" />Save Changes
                        </button>
                        <button onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-border text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-95 transition-all duration-200 ease-in-out">
                          <Trash2 className="w-3.5 h-3.5" />Delete
                        </button>
                        <button onClick={() => setIsExpanded(false)}
                          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-200 ease-in-out">
                          <ChevronUp className="w-3.5 h-3.5" />Collapse
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {readOnly && (
                  <div className="flex items-center gap-3 pt-2 mt-2">
                    <button onClick={() => setIsExpanded(false)}
                      className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-200 ease-in-out">
                      <ChevronUp className="w-3.5 h-3.5" />Collapse
                    </button>
                  </div>
                )}

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default JobCard;
