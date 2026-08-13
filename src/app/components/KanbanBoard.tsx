import { useState } from "react";
import { Calendar, Trash2 } from "lucide-react";
import { Job, Status, STATUSES } from "../../app/types";
import { useThemeSettings } from "../../hooks/useThemeSettings";

function hexToRgb(hex?: string) {
  const h = (hex || "#3b82f6").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

export default function KanbanBoard({
  jobs,
  updateJob,
  deleteJob,
}: {
  jobs: Job[];
  updateJob: (id: string, fields: Record<string, unknown>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
}) {
  const { statusColors } = useThemeSettings();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<Status | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function openCard(job: Job) {
    if (expandedId === job.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(job.id);
    setNotesDraft(job.notes ?? "");
    setConfirmDelete(false);
  }

  return (
    <div className="flex gap-3 h-full items-stretch">
      {STATUSES.map((status) => {
        const colJobs = jobs.filter((j) => j.status === status);
        const color = statusColors[status] || "#3b82f6";
        return (
          <div
            key={status}
            className={`w-64 shrink-0 flex flex-col rounded-xl border bg-card/60 transition-colors ${
              overStatus === status ? "border-primary/40 bg-accent/5" : "border-border"
            }`}
            onDragOver={(e) => { e.preventDefault(); setOverStatus(status); }}
            onDragLeave={() => setOverStatus((s) => (s === status ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              setOverStatus(null);
              setDraggingId(null);
              if (id) updateJob(id, { status });
            }}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs font-semibold text-foreground truncate">{status}</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted">
                {colJobs.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2" style={{ scrollbarWidth: "thin" }}>
              {colJobs.length === 0 && (
                <div className="rounded-lg border border-dashed border-border h-16 flex items-center justify-center text-[11px] text-muted-foreground">
                  Drop here
                </div>
              )}
              {colJobs.map((job) => (
                <div key={job.id}>
                  <div
                    draggable
                    onDragStart={(e) => {
                      setDraggingId(job.id);
                      e.dataTransfer.setData("text/plain", job.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => openCard(job)}
                    className={`group rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing transition-colors ${
                      draggingId === job.id ? "opacity-50" : ""
                    } ${expandedId === job.id ? "border-primary/40" : "border-border hover:border-primary/40"}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{job.company}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{job.role}</p>
                      </div>
                    </div>
                    {job.deadline && (
                      <span className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                        <Calendar className="w-3 h-3" />{fmt(job.deadline)}
                      </span>
                    )}
                  </div>

                  {/* Inline edit */}
                  {expandedId === job.id && (
                    <div className="mt-1 rounded-lg border border-border bg-card p-3 flex flex-col gap-2.5">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
                        <select
                          value={job.status}
                          onChange={(e) => updateJob(job.id, { status: e.target.value })}
                          className="px-2 py-1.5 rounded-md border border-border bg-input-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-muted-foreground">Deadline</label>
                          <input
                            type="date"
                            value={job.deadline ?? ""}
                            onChange={(e) => updateJob(job.id, { deadline: e.target.value || null })}
                            className="px-2 py-1.5 rounded-md border border-border bg-input-background text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-muted-foreground">Interview</label>
                          <input
                            type="date"
                            value={job.interviewDate ?? ""}
                            onChange={(e) => updateJob(job.id, { interviewDate: e.target.value || null })}
                            className="px-2 py-1.5 rounded-md border border-border bg-input-background text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-muted-foreground">Notes</label>
                        <textarea
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          rows={2}
                          className="px-2 py-1.5 rounded-md border border-border bg-input-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                        />
                        <button
                          onClick={() => updateJob(job.id, { notes: notesDraft || null })}
                          className="mt-1 px-2 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium self-end hover:opacity-90"
                        >
                          Save notes
                        </button>
                      </div>

                      {confirmDelete ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-red-600 dark:text-red-400">Delete this application?</span>
                          <button
                            onClick={() => deleteJob(job.id)}
                            className="px-2 py-1 rounded bg-red-600 text-white text-[10px] font-medium hover:bg-red-700"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="px-2 py-1 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(true)}
                          className="flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 hover:underline w-fit"
                        >
                          <Trash2 className="w-3 h-3" />Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
