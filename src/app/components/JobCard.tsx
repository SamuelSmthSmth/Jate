import { useState } from "react";
import {
  MapPin, Calendar, Clock, ChevronDown, ChevronUp, Save, Trash2,
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
  Applied:      "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50",
  Waiting:      "bg-gray-50 text-gray-400 border border-dashed border-gray-300 dark:bg-gray-900/30 dark:text-gray-500 dark:border-gray-700",
  Assessment:   "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800/50",
  Interviewing: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50",
  Rejected:     "bg-red-50 text-red-500 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50",
  Offer:        "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/50",
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
  L: "bg-teal-100 text-teal-700",
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
    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2.5"
       style={{ fontFamily: "'Geist Mono', monospace" }}>
      {children}
    </p>
  );
}

function FieldInput({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-2.5 py-1.5 rounded-md border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        style={type === "date" ? { fontFamily: "'Geist Mono', monospace" } : undefined} />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JobCard({
  job,
  updateJob,
  deleteJob,
  isLast = false,
}: {
  job: Job;
  updateJob: (id: string, data: Record<string, unknown>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  isLast?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);

  function handleExpand() {
    if (isExpanded) { setIsExpanded(false); return; }
    setIsExpanded(true);
    if (!edit) {
      setEdit({
        status: (job.status as Status) ?? "Applied",
        deadline: job.deadline ?? "",
        appliedDate: job.appliedDate ?? "",
        interviewDate: job.interviewDate ?? "",
        postingUrl: job.postingUrl ?? "",
        portalUrl: job.portalUrl ?? "",
        salary: job.salary ?? "",
        salaryType: job.salaryType ?? "Paid",
        notes: job.notes ?? "",
      });
    }
  }

  function upd(field: Partial<EditState>) {
    setEdit((prev) => prev ? { ...prev, ...field } : prev);
  }

  async function handleSave() {
    if (!edit) return;
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
    });
  }

  async function handleDelete() {
    await deleteJob(job.id);
  }

  const displayStatus = (isExpanded && edit ? edit.status : job.status) as Status;

  return (
    <div className={isLast ? "" : "border-b border-border"}>
      {/* ── Collapsed row ── */}
      <div
        onClick={handleExpand}
        className={`group flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer ${
          isExpanded ? "bg-accent/30 dark:bg-accent/10" : "bg-card hover:bg-secondary"
        }`}
      >
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0 mt-0.5 ${getAvatarColor(job.company)}`}>
          {(job.company?.[0] ?? "?").toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{job.company}</p>
              <p className="text-sm text-muted-foreground truncate">{job.role}</p>
            </div>
            <span
              className={`shrink-0 text-[11px] px-2 py-0.5 rounded font-medium ${statusStyles[displayStatus] ?? statusStyles.Applied}`}
              style={{ fontFamily: "'Geist Mono', monospace" }}
            >
              {displayStatus}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            {job.location && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground"
                style={{ fontFamily: "'Geist Mono', monospace" }}>
                <MapPin className="w-3 h-3" />{job.location}
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground"
              style={{ fontFamily: "'Geist Mono', monospace" }}>
              <Calendar className="w-3 h-3" />Due {fmt(job.deadline)}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground"
              style={{ fontFamily: "'Geist Mono', monospace" }}>
              <Clock className="w-3 h-3" />Applied {fmt(job.appliedDate)}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <div className="shrink-0 mt-1 text-muted-foreground">
          {isExpanded
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </div>
      </div>

      {/* ── Accordion ── */}
      <div style={{ display: "grid", gridTemplateRows: isExpanded ? "1fr" : "0fr", transition: "grid-template-rows 0.25s ease" }}>
        <div style={{ overflow: "hidden" }}>
          {edit && (
            <div className="px-5 pb-5 pt-2 bg-secondary/60 dark:bg-muted/20 border-t border-border">
              <div className="ml-[52px] flex flex-col gap-5">

                {/* Status */}
                <div>
                  <SectionLabel>Status</SectionLabel>
                  <select value={edit.status} onChange={(e) => upd({ status: e.target.value as Status })}
                    className="px-2.5 py-1.5 rounded-md border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Dates */}
                <div>
                  <SectionLabel>Dates</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldInput label="Due Date" type="date" value={edit.deadline}
                      onChange={(v) => upd({ deadline: v })} />
                    <FieldInput label="Applied Date" type="date" value={edit.appliedDate}
                      onChange={(v) => upd({ appliedDate: v })} />
                    {edit.status === "Interviewing" && (
                      <div className="col-span-2">
                        <FieldInput label="Interview Date (Scheduling)" type="date"
                          value={edit.interviewDate} onChange={(v) => upd({ interviewDate: v })} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Links */}
                <div>
                  <SectionLabel>Links</SectionLabel>
                  <div className="flex flex-col gap-3">
                    <FieldInput label="Posting URL" value={edit.postingUrl}
                      onChange={(v) => upd({ postingUrl: v })} placeholder="company.com/jobs/role" />
                    <FieldInput label="Application Portal URL" value={edit.portalUrl}
                      onChange={(v) => upd({ portalUrl: v })} placeholder="jobs.lever.co/company/apply" />
                  </div>
                </div>

                {/* Compensation */}
                <div>
                  <SectionLabel>Compensation</SectionLabel>
                  <div className="flex items-center gap-1 mb-3 p-0.5 bg-muted rounded-md w-fit">
                    {(["Paid", "Volunteer"] as SalaryType[]).map((type) => (
                      <button key={type} onClick={() => upd({ salaryType: type })}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          edit.salaryType === type
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}>
                        {type}
                      </button>
                    ))}
                  </div>
                  {edit.salaryType === "Paid" && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-foreground">Salary Amount</label>
                      <div className="flex items-center">
                        <span className="px-2.5 py-1.5 text-sm text-muted-foreground border border-r-0 border-border bg-muted rounded-l-md">$</span>
                        <input type="text" value={edit.salary}
                          onChange={(e) => upd({ salary: e.target.value })}
                          placeholder="110,000"
                          className="flex-1 px-2.5 py-1.5 border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          style={{ fontFamily: "'Geist Mono', monospace" }} />
                        <span className="px-2.5 py-1.5 text-xs text-muted-foreground border border-l-0 border-border bg-muted rounded-r-md whitespace-nowrap">/ year</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <SectionLabel>Notes</SectionLabel>
                  <textarea value={edit.notes} onChange={(e) => upd({ notes: e.target.value })}
                    placeholder="Add notes about this application..."
                    rows={3}
                    className="w-full px-2.5 py-2 rounded-md border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={handleSave}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                    <Save className="w-3.5 h-3.5" />Save Changes
                  </button>
                  <button onClick={handleDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/5 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />Delete Job
                  </button>
                  <button onClick={() => setIsExpanded(false)}
                    className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <ChevronUp className="w-3.5 h-3.5" />Collapse
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
