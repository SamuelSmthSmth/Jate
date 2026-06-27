import { Status } from "../app/types";

export const STATUSES: Status[] = ["Not Applied", "Applied", "Waiting", "Assessment", "Interviewing", "Offer", "Rejected"];

export const DEFAULT_STATUS_COLORS: Record<Status, string> = {
  "Not Applied": "#71717a", // Muted Gray/Subtle Silver
  "Applied": "#3b82f6",     // Blue
  "Waiting": "#f59e0b",     // Amber
  "Assessment": "#8b5cf6",  // Violet
  "Interviewing": "#10b981",// Emerald
  "Offer": "#22c55e",       // Green
  "Rejected": "#ef4444",    // Red
};
