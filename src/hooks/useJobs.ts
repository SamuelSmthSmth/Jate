import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

type JobRow = Record<string, unknown>;

/** Map a Supabase `jobs` row (snake_case) to the app's camelCase job shape. */
export function mapJobRow(row: JobRow) {
  return {
    id: row.id as string,
    company: (row.company as string) ?? "",
    role: (row.role as string) ?? "",
    location: (row.location as string) ?? "",
    status: (row.status as string) ?? "Not Applied",
    deadline: (row.deadline as string) ?? "",
    notes: (row.notes as string | null) ?? null,
    url: (row.url as string | null) ?? null,
    postingUrl: (row.posting_url as string | null) ?? null,
    portalUrl: (row.portal_url as string | null) ?? null,
    appliedDate: (row.applied_date as string) ?? "",
    interviewDate: (row.interview_date as string | null) ?? null,
    salary: (row.salary as string | null) ?? null,
    salaryType: (row.salary_type as string | null) ?? null,
    isPaid: (row.is_paid as boolean | null) ?? null,
    trackrId: (row.trackr_id as string | null) ?? null,
    trackrType: (row.trackr_type as string | null) ?? null,
    isArchived: (row.is_archived as boolean) ?? false,
  };
}

const JOB_FIELD_MAP: Record<string, string> = {
  company: "company",
  role: "role",
  location: "location",
  status: "status",
  deadline: "deadline",
  notes: "notes",
  url: "url",
  postingUrl: "posting_url",
  portalUrl: "portal_url",
  appliedDate: "applied_date",
  interviewDate: "interview_date",
  salary: "salary",
  salaryType: "salary_type",
  isPaid: "is_paid",
  trackrId: "trackr_id",
  trackrType: "trackr_type",
};

function jobToRow(payload: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    row[JOB_FIELD_MAP[key] ?? key] = value;
  }
  return row;
}

export function useJobs(userId: string | null) {
  const [jobs, setJobs] = useState<Record<string, unknown>[]>([]);

  const load = useCallback(async () => {
    if (!userId) {
      setJobs([]);
      return;
    }
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (!error && data) setJobs(data.map(mapJobRow));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addJob = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from("jobs")
      .insert({ ...jobToRow(payload), user_id: userId })
      .select()
      .single();
    if (error) throw error;
    if (data) setJobs((prev) => [...prev, mapJobRow(data)]);
  };

  const updateJob = async (jobId: string, updatedFields: Record<string, unknown>) => {
    const { error } = await supabase
      .from("jobs")
      .update(jobToRow(updatedFields))
      .eq("id", jobId);
    if (error) throw error;
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, ...updatedFields } : j))
    );
  };

  const deleteJob = async (jobId: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    if (error) throw error;
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  return { jobs, addJob, updateJob, deleteJob };
}
