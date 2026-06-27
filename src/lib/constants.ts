import { Status } from "../app/types";

export const STATUSES: Status[] = ["Applied", "Waiting", "Assessment", "Interviewing", "Offer", "Rejected"];

export const DEFAULT_STATUS_COLORS: Record<Status, string> = {
  "Applied": "#3b82f6",     // Blue
  "Waiting": "#f59e0b",     // Amber
  "Assessment": "#8b5cf6",  // Violet
  "Interviewing": "#10b981",// Emerald
  "Offer": "#22c55e",       // Green
  "Rejected": "#ef4444",    // Red
};
