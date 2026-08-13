import { motion } from "framer-motion";
import {
  Plus, Compass, CalendarClock, CalendarCheck, Layers, Sparkles, ArrowRight,
} from "lucide-react";
import { Job } from "../../app/types";

type NavTarget = "my-jobs" | "calendar" | "opportunities";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function relativeDay(dateStr: string) {
  const today = startOfToday();
  const target = new Date(dateStr + "T00:00:00");
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return `${-diff}d ago`;
  return `In ${diff} days`;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function StatCard({ icon: Icon, label, value, caption }: {
  icon: typeof Layers;
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-3xl font-semibold text-foreground mt-2">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{caption}</p>
    </div>
  );
}

type Event = {
  id: string;
  company: string;
  role: string;
  date: string;
  kind: "interview" | "deadline";
};

export default function HomeView({
  jobs,
  userName,
  onOpenAdd,
  onNavigate,
}: {
  jobs: Job[];
  userName?: string | null;
  onOpenAdd: () => void;
  onNavigate: (nav: NavTarget) => void;
}) {
  const firstName = (userName || "").trim().split(/\s+/)[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const today = startOfToday();
  const active = jobs.filter((j) => j.status !== "Rejected");
  const upcomingInterviews = jobs.filter(
    (j) => j.interviewDate && new Date(j.interviewDate + "T00:00:00") >= today && j.status !== "Rejected"
  );
  const upcomingDeadlines = jobs.filter(
    (j) => j.deadline && new Date(j.deadline + "T00:00:00") >= today && j.status !== "Rejected"
  );

  const events: Event[] = [];
  for (const j of active) {
    if (j.interviewDate && new Date(j.interviewDate + "T00:00:00") >= today) {
      events.push({ id: j.id + "-iv", company: j.company, role: j.role, date: j.interviewDate, kind: "interview" });
    } else if (j.deadline && new Date(j.deadline + "T00:00:00") >= today) {
      events.push({ id: j.id + "-dl", company: j.company, role: j.role, date: j.deadline, kind: "deadline" });
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = events.slice(0, 5);

  const nextInterview = upcomingInterviews
    .slice()
    .sort((a, b) => (a.interviewDate || "").localeCompare(b.interviewDate || ""))[0];

  const headline = active.length === 0
    ? "Ready to get started?"
    : nextInterview
      ? "You've got this"
      : "Here's what's next";

  const subtitle = active.length === 0
    ? "Add your first application or browse opportunities to find somewhere you'd love to work."
    : nextInterview
      ? `Your next interview is coming up — ${nextInterview.company}${nextInterview.role ? " · " + nextInterview.role : ""}.`
      : "A quick look at what's coming up across your applications.";

  return (
    <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-10" style={{ scrollbarWidth: "none" }}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-4xl mx-auto pt-2"
      >
        {/* Greeting */}
        <p className="text-sm font-medium text-muted-foreground">{greeting}, {firstName} 👋</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mt-1.5">
          {headline}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">{subtitle}</p>

        {/* CTAs */}
        <div className="flex items-center gap-3 mt-6 flex-wrap">
          <button
            onClick={onOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />Add application
          </button>
          <button
            onClick={() => onNavigate("opportunities")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-secondary/60 transition-colors"
          >
            <Compass className="w-4 h-4" />Browse opportunities
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
          <StatCard icon={Layers} label="In the pipeline" value={active.length} caption="applications in progress" />
          <StatCard
            icon={CalendarClock}
            label="Upcoming interviews"
            value={upcomingInterviews.length}
            caption={upcomingInterviews.length ? "booked in" : "none scheduled yet"}
          />
          <StatCard
            icon={CalendarCheck}
            label="Upcoming deadlines"
            value={upcomingDeadlines.length}
            caption={upcomingDeadlines.length ? "worth watching" : "nothing due soon"}
          />
        </div>

        {/* Coming up */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Coming up</h2>
            <button
              onClick={() => onNavigate("calendar")}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Calendar <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">All clear</p>
              <p className="text-xs text-muted-foreground mt-1">
                {active.length
                  ? "No deadlines or interviews coming up — enjoy the breather."
                  : "Add an application to start building your pipeline."}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
              {upcoming.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${ev.kind === "interview" ? "bg-accent" : "bg-blue-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {ev.company}
                      {ev.role ? <span className="text-muted-foreground font-normal"> · {ev.role}</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{relativeDay(ev.date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        ev.kind === "interview"
                          ? "bg-accent/15 text-accent"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {ev.kind === "interview" ? "Interview" : "Deadline"}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">{fmtDate(ev.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Encouraging footer */}
        {active.length > 0 && (
          <p className="text-center text-xs text-muted-foreground mt-8">
            Keep it up — every application is a step forward. ✦
          </p>
        )}
      </motion.div>
    </div>
  );
}
