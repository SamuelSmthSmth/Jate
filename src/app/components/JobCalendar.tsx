import { useMemo, type ReactNode } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, startOfDay, isSameDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Mic, CalendarClock, Briefcase } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../../styles/calendar.css";

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales: { "en-US": enUS } });

type JobCalendarProps = {
  jobs: any[];
};

const MESSAGES = {
  today: "Today",
  previous: "Back",
  next: "Next",
  month: "Month",
  week: "Week",
  agenda: "Agenda",
  date: "Date",
  time: "Time",
  event: "Event",
  allDay: "All day",
  noEventsInRange: "Nothing scheduled here.",
  showMore: (total: number) => `+${total} more`,
};

const VIEW_OPTIONS = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "agenda", label: "Agenda" },
];

function CalendarToolbar({ label, view, onView, onNavigate }: any) {
  return (
    <div className="rbc-custom-toolbar">
      <div className="rbc-custom-toolbar-nav">
        <button type="button" className="rbc-nav-btn rbc-nav-today" onClick={() => onNavigate("TODAY")}>
          Today
        </button>
        <button type="button" className="rbc-nav-btn rbc-nav-icon" onClick={() => onNavigate("PREV")} aria-label="Previous">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button type="button" className="rbc-nav-btn rbc-nav-icon" onClick={() => onNavigate("NEXT")} aria-label="Next">
          <ChevronRight className="w-4 h-4" />
        </button>
        <span className="rbc-custom-toolbar-label">{label}</span>
      </div>
      <div className="rbc-custom-toolbar-right">
        <div className="rbc-legend">
          <span className="rbc-legend-item">
            <span className="rbc-legend-dot rbc-legend-deadline" />
            Deadline
          </span>
          <span className="rbc-legend-item">
            <span className="rbc-legend-dot rbc-legend-interview" />
            Interview
          </span>
        </div>
        <div className="rbc-view-switcher">
          {VIEW_OPTIONS.map((v) => (
            <button
              key={v.key}
              type="button"
              className={view === v.key ? "is-active" : ""}
              onClick={() => onView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarEvent({ event }: any) {
  const isDeadline = event.kind === "deadline";
  return (
    <div className={`rbc-cal-event-inner ${isDeadline ? "is-deadline" : "is-interview"}`}>
      <span className="rbc-cal-event-icon">
        {isDeadline ? <Clock className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
      </span>
      <span className="rbc-cal-event-label">{event.company}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "red" | "blue" | "neutral";
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          tone === "red"
            ? "bg-red-500/10 text-red-500"
            : tone === "blue"
              ? "bg-blue-500/10 text-blue-500"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground truncate mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function JobCalendar({ jobs }: JobCalendarProps) {
  const events = useMemo(() => {
    const list: any[] = [];
    jobs.forEach((job, i) => {
      const label = job.company ?? "Untitled";
      const signup = job.deadline;
      if (signup) {
        list.push({
          id: `deadline-${job.id ?? i}`,
          title: `${label} · Deadline`,
          company: label,
          kind: "deadline",
          start: new Date(`${signup}T12:00:00`),
          end: new Date(`${signup}T12:00:00`),
          allDay: true,
        });
      }
      const interview = job.interviewDate;
      if (interview) {
        list.push({
          id: `interview-${job.id ?? i}`,
          title: `${label} · Interview`,
          company: label,
          kind: "interview",
          start: new Date(`${interview}T12:00:00`),
          end: new Date(`${interview}T12:00:00`),
          allDay: true,
        });
      }
    });
    return list;
  }, [jobs]);

  const today = startOfDay(new Date());
  const upcomingInterviews = events.filter((e) => e.kind === "interview" && e.start >= today).length;
  const upcomingDeadlines = events.filter((e) => e.kind === "deadline" && e.start >= today).length;

  const eventPropGetter = (event: any) => {
    const style =
      event.kind === "deadline"
        ? { backgroundColor: "rgba(239,68,68,0.13)", color: "#dc2626", borderLeft: "3px solid #ef4444" }
        : { backgroundColor: "rgba(59,130,246,0.13)", color: "#2563eb", borderLeft: "3px solid #3b82f6" };
    return { style };
  };

  const dayPropGetter = (date: Date) => {
    const has = events.some((e) => isSameDay(e.start, date));
    return { className: has ? "rbc-has-events" : "" };
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        <Stat label="Upcoming interviews" value={upcomingInterviews} tone="blue" icon={<Mic className="w-4 h-4" />} />
        <Stat label="Upcoming deadlines" value={upcomingDeadlines} tone="red" icon={<CalendarClock className="w-4 h-4" />} />
        <Stat label="Applications tracked" value={jobs.length} tone="neutral" icon={<Briefcase className="w-4 h-4" />} />
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <Calendar
          localizer={localizer}
          events={events}
          defaultView={Views.MONTH}
          views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
          style={{ height: "100%" }}
          eventPropGetter={eventPropGetter}
          dayPropGetter={dayPropGetter}
          messages={MESSAGES}
          popup
          components={{
            toolbar: CalendarToolbar,
            event: CalendarEvent,
          }}
        />
      </div>
    </div>
  );
}
