import { Job } from "../app/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateOnly(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function esc(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}Z`;
}

/** Builds and downloads an .ics file with the user's upcoming deadlines and interviews. */
export function downloadICS(jobs: Job[]) {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JATE//Job Application Tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  const now = stamp();

  jobs.forEach((job) => {
    const company = job.company || "Unknown";
    const role = job.role || "";
    const label = role ? `${company} — ${role}` : company;

    if (job.deadline) {
      lines.push(
        "BEGIN:VEVENT",
        `UID:jate-deadline-${job.id}@jate`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${toDateOnly(job.deadline)}`,
        `DTEND;VALUE=DATE:${addDays(job.deadline, 1)}`,
        `SUMMARY:${esc("Deadline: " + label)}`,
        "TRANSP:TRANSPARENT",
        "END:VEVENT"
      );
    }

    if (job.interviewDate) {
      lines.push(
        "BEGIN:VEVENT",
        `UID:jate-interview-${job.id}@jate`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${toDateOnly(job.interviewDate)}`,
        `DTEND;VALUE=DATE:${addDays(job.interviewDate, 1)}`,
        `SUMMARY:${esc("Interview: " + label)}`,
        "TRANSP:OPAQUE",
        "END:VEVENT"
      );
    }
  });

  lines.push("END:VCALENDAR");

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "jate-calendar.ics";
  a.click();
  URL.revokeObjectURL(url);
}
