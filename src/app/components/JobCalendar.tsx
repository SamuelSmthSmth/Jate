import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales: { "en-US": enUS } });

type JobCalendarProps = {
  jobs: any[];
};

export default function JobCalendar({ jobs }: JobCalendarProps) {
  const events: any[] = [];
  jobs.forEach(job => {
    const label = job.company ?? "";
    const signupDate = job.deadlines?.signup ?? job.deadline;
    if (signupDate) {
      events.push({
        title: `📅 ${label} — Deadline`,
        start: new Date(`${signupDate}T12:00:00`),
        end:   new Date(`${signupDate}T12:00:00`),
        allDay: true,
        type: "deadline",
      });
    }
    const interviewDate = job.deadlines?.interview ?? job.interviewDate;
    if (interviewDate) {
      events.push({
        title: `🎤 ${label} — Interview`,
        start: new Date(`${interviewDate}T12:00:00`),
        end:   new Date(`${interviewDate}T12:00:00`),
        allDay: true,
        type: "interview",
      });
    }
  });

  const eventPropGetter = (event: any) => {
    let backgroundColor = "";
    if (event.type === "deadline") {
      backgroundColor = "#ef4444"; // red
    } else if (event.type === "interview") {
      backgroundColor = "#3b82f6"; // blue
    }
    return { style: { backgroundColor } };
  };

  return (
    <Calendar
      localizer={localizer}
      events={events}
      defaultView={Views.MONTH}
      style={{ height: "100%" }}
      eventPropGetter={eventPropGetter}
    />
  );
}
