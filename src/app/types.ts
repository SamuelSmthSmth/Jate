export type Status = "Not Applied" | "Waiting" | "Applied" | "Assessment" | "Interviewing" | "Rejected" | "Offer";
export type SalaryType = "Paid" | "Volunteer";

export type Job = {
  id: string;
  company: string;
  role: string;
  status: Status;
  deadline?: string | null;
  location?: string | null;
  notes?: string | null;
  appliedDate?: string | null;
  postingUrl?: string | null;
  portalUrl?: string | null;
  salary?: string | null;
  salaryType?: SalaryType | null;
  interviewDate?: string | null;
  url?: string | null;
  trackrId?: string | null;
  trackrType?: string | null;
  [key: string]: unknown;
};

/** Ordered list of application statuses (used in dropdowns and the status-color editor). */
export const STATUSES: Status[] = ["Not Applied", "Applied", "Waiting", "Assessment", "Interviewing", "Offer", "Rejected"];
