import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router";
import {
  Briefcase, Settings, LayoutGrid, List,
  CalendarDays, Moon, Sun,
  ArrowUpDown, Download, Upload, LogOut, Compass,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import Papa from "papaparse";
import { supabase } from "../supabase";
import { useAuth } from "../hooks/useAuth";
import { useJobs } from "../hooks/useJobs";
import { loginWithEmail, registerWithEmail } from "../hooks/useEmailAuth";
import JobCard from "./components/JobCard";
import { useThemeSettings } from "../hooks/useThemeSettings";
import JobCalendar from "./components/JobCalendar";
import LoadingScreen from "./components/LoadingScreen";
import LoginScreen from "./components/LoginScreen";
import AddJobDialog, { AddJobForm } from "./components/AddJobDialog";
import SettingsView from "./components/SettingsView";
import OpportunitiesTab from "./components/OpportunitiesTab";
import { getBgClass } from "../lib/backgrounds";
import { Status, Job } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = "my-jobs" | "calendar" | "opportunities" | "settings";
type Filter = "All" | Status;
type SortKey = "deadline" | "salary";

// ─── Constants ────────────────────────────────────────────────────────────────

const navItems: { id: NavItem; label: string; icon: typeof Briefcase }[] = [
  { id: "my-jobs",        label: "My Jobs",       icon: Briefcase    },
  { id: "calendar",       label: "Calendar",       icon: CalendarDays },
  { id: "opportunities",  label: "Opportunities",  icon: Compass      },
  { id: "settings",       label: "Settings",       icon: Settings     },
];

const FILTERS: Filter[] = ["All", "Not Applied", "Applied", "Waiting", "Assessment", "Interviewing", "Rejected", "Offer"];
const EMPTY_FORM: AddJobForm = { company: "", role: "", location: "", status: "Not Applied", deadline: "", notes: "" };

const PAGE_TITLES: Record<NavItem, string> = {
  "my-jobs":       "My Jobs",
  "calendar":      "Calendar",
  "opportunities": "Opportunities",
  "settings":      "Settings",
};

const NAV_PATHS: Record<NavItem, string> = {
  "my-jobs":       "/myjobs",
  "calendar":      "/calendar",
  "opportunities": "/opportunities",
  "settings":      "/settings",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSalary(s?: string | null) {
  return s ? parseInt(s.replace(/\D/g, ""), 10) || 0 : 0;
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function exportCSV(jobs: Job[]) {
  const headers = ["Company", "Title", "Status", "Paid", "Salary", "Deadline", "Interview", "URL", "Notes"];
  const esc = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const rows = jobs.map((j) =>
    [
      j.company,
      j.role,
      j.status,
      j.salaryType === "Paid" ? "Yes" : "No",
      j.salary ?? "",
      j.deadline ?? "",
      j.interviewDate ?? "",
      j.url ?? j.postingUrl ?? "",
      j.notes ?? ""
    ].map(esc)
  );
  const csv = [headers.map(esc), ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "jate-jobs.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
    const savedAccent = localStorage.getItem('accentColor');
    if (savedAccent) {
      document.documentElement.style.setProperty('--accent-hex', savedAccent);
    }
  }, []);

  const { user, loading, loginWithGoogle, logout, refreshUser } = useAuth();
  const { jobs, addJob, updateJob, deleteJob } = useJobs(user?.uid ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dark, setDark] = useState(false);
  const { fontFamily, density, backgroundStyle, statusColors, setFontFamily, setDensity, setBackgroundStyle, setStatusColor } = useThemeSettings();

  const activeNav: NavItem = location.pathname.startsWith("/calendar")
    ? "calendar"
    : location.pathname.startsWith("/opportunities")
    ? "opportunities"
    : location.pathname.startsWith("/settings")
    ? "settings"
    : "my-jobs";

  const go = (id: NavItem) => navigate(NAV_PATHS[id]);

  useEffect(() => {
    if (location.pathname === "/") navigate("/myjobs", { replace: true });
  }, [location.pathname, navigate]);

  const [isStealthMode, setIsStealthMode] = useState(() => localStorage.getItem("stealthMode") === "true");
  useEffect(() => {
    localStorage.setItem("stealthMode", String(isStealthMode));
  }, [isStealthMode]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewType, setViewType] = useState<"list" | "grid">("list");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const effectiveViewType = isMobile ? 'grid' : viewType;

  // My Jobs UI state
  const [filter, setFilter] = useState<Filter>("All");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddJobForm>(EMPTY_FORM);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Settings — editable display name
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  // ── Auth gates ──────────────────────────────────────────────────────────────

  if (loading) return <LoadingScreen />;
  if (!user) return (
    <LoginScreen
      onGoogleLogin={() => loginWithGoogle()}
      onEmailLogin={loginWithEmail}
      onEmailRegister={registerWithEmail}
    />
  );

  // ── Job handlers ────────────────────────────────────────────────────────────

  async function handleAddJob() {
    if (!form.company.trim() || !form.role.trim()) return;
    await addJob({
      company: form.company.trim(),
      role: form.role.trim(),
      location: form.location.trim() || "Remote",
      status: form.status,
      deadline: form.deadline || new Date().toISOString().slice(0, 10),
      notes: form.notes.trim() || null,
      appliedDate: new Date().toISOString().slice(0, 10),
    });
    setForm(EMPTY_FORM);
    setShowAdd(false);
  }

  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        await Promise.all(
          rows.map(async (row) => {
            if (!row.Company) return;
            const statusStr = row.Status || "Not Applied";
            const isPaid = row.Paid === "Yes";
            await addJob({
              company: row.Company,
              role: row.Title || "",
              status: ["Not Applied", "Applied", "Waiting", "Assessment", "Interviewing", "Offer", "Rejected"].includes(statusStr) ? statusStr as Status : "Not Applied",
              deadline: row.Deadline || null,
              interviewDate: row.Interview || null,
              postingUrl: row.URL || null,
              salary: row.Salary || null,
              salaryType: isPaid ? "Paid" : "Volunteer",
              notes: row.Notes || null,
              appliedDate: new Date().toISOString().slice(0, 10),
            });
          })
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  }

  async function seedDemoData() {
    const demoJobs = [
      { company: "Stripe", role: "Product Designer", location: "Remote", status: "Applied", deadline: daysFromNow(18), appliedDate: daysFromNow(-14), postingUrl: "stripe.com/jobs/product-designer-2026", portalUrl: "jobs.lever.co/stripe/apply/pd", salary: "110000", salaryType: "Paid", notes: "Found via LinkedIn. Strong interest in payments UX." },
      { company: "Airbnb", role: "Data Analyst", location: "San Francisco, CA", status: "Rejected", deadline: daysFromNow(30), appliedDate: daysFromNow(-21) },
      { company: "Linear", role: "Growth Engineer", location: "Remote", status: "Waiting", deadline: daysFromNow(9), appliedDate: daysFromNow(-6) },
      { company: "Notion", role: "Product Manager", location: "New York, NY", status: "Interviewing", deadline: daysFromNow(21), appliedDate: daysFromNow(-28), interviewDate: daysFromNow(4) }
    ];
    for (const j of demoJobs) {
      await addJob(j);
    }
  }

  function handleSortClick(key: SortKey) {
    if (sortKey === key) { setSortDir((d) => d === "asc" ? "desc" : "asc"); return; }
    setSortKey(key);
    setSortDir(key === "deadline" ? "asc" : "desc");
  }

  // ── Display name update ─────────────────────────────────────────────────────

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === user.displayName) { setEditingName(false); return; }
    setSavingName(true);
    try {
      await supabase.from("profiles").update({ display_name: trimmed }).eq("id", user.uid);
      await refreshUser();
    } finally {
      setSavingName(false);
      setEditingName(false);
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const typedJobs = jobs as Job[];

  const filtered = (filter === "All" ? typedJobs : typedJobs.filter((j) => j.status === filter))
    .slice().sort((a, b) => {
      if (!sortKey) return 0;
      if (sortKey === "deadline") {
        const d = (a.deadline ?? "").localeCompare(b.deadline ?? "");
        return sortDir === "asc" ? d : -d;
      }
      const sa = parseSalary(a.salary), sb = parseSalary(b.salary);
      if (!sa && !sb) return 0; if (!sa) return 1; if (!sb) return -1;
      return sortDir === "desc" ? sb - sa : sa - sb;
    });

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === "All" ? typedJobs.length : typedJobs.filter((j) => j.status === f).length;
    return acc;
  }, {} as Record<Filter, number>);

  const agendaJobs = typedJobs
    .map((j) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let dateStr = "";
      let isInterview = false;
      if (j.interviewDate && new Date(j.interviewDate) >= today) {
        dateStr = j.interviewDate;
        isInterview = true;
      } else if (j.deadline && new Date(j.deadline) >= today) {
        dateStr = j.deadline;
      }
      return { ...j, agendaDate: dateStr, isInterview };
    })
    .filter((j) => j.agendaDate)
    .sort((a, b) => new Date(a.agendaDate).getTime() - new Date(b.agendaDate).getTime())
    .slice(0, 5);

  const getRelativeTime = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `In ${diffDays} days`;
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={`relative size-full flex overflow-hidden bg-background text-foreground ${dark ? "dark" : ""} font-${fontFamily}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={backgroundStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className={`absolute inset-0 z-0 pointer-events-none ${getBgClass(backgroundStyle)}`}
        >
          {backgroundStyle === 'animated' && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[100px]" />
              <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px]" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="relative z-10 flex size-full">

      {/* ── Sidebar ── */}
      <aside className={`hidden md:flex flex-col shrink-0 bg-card border-r border-border h-full transition-[width] duration-300 ease-in-out ${sidebarOpen ? "w-[220px]" : "w-[68px]"}`}>
        {/* JATE logo + collapse indent */}
        <div className={`flex items-center pt-4 pb-3 ${sidebarOpen ? "px-4 gap-2.5" : "justify-center"}`}>
          {sidebarOpen && (
            <>
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground text-sm font-bold leading-none">J</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-tight text-foreground leading-tight">JATE</p>
                <p className="text-[9px] text-muted-foreground leading-tight truncate">Job Application Tracker</p>
              </div>
            </>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"} aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="shrink-0 flex items-center justify-center w-8 h-6 rounded-md border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out">
            {sidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="w-full h-px bg-border" />

        <nav className={`flex flex-col gap-0.5 pt-3 flex-1 ${sidebarOpen ? "px-3" : "px-2"}`}>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => go(id)} title={label}
              className={`flex items-center rounded-md text-sm w-full transition-colors ${
                sidebarOpen ? "gap-2.5 px-3 py-2 text-left" : "justify-center py-2.5"
              } ${
                activeNav === id
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out"
              }`}>
              <Icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </button>
          ))}

          {sidebarOpen && agendaJobs.length > 0 && (
            <div className="mt-6 mb-2">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Upcoming Agenda</h3>
              <div className="flex flex-col gap-0.5">
                {agendaJobs.map(j => (
                  <button
                    key={j.id}
                    onClick={() => {
                      go('my-jobs');
                      setFilter('All');
                    }}
                    className="flex flex-col gap-0.5 px-3 py-2 rounded-md text-left transition-colors hover:bg-muted active:scale-95 group"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${j.isInterview ? 'bg-accent' : 'bg-blue-500'}`} />
                      <span className="text-xs font-medium text-foreground truncate group-hover:text-accent-foreground transition-colors">{j.company} - {j.role}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground pl-3.5 leading-tight font-mono">
                      {j.isInterview ? 'Interview ' : 'Due '}{getRelativeTime(j.agendaDate)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User profile */}
        <div className={`pb-5 pt-3 ${sidebarOpen ? "px-4" : "px-2"}`}>
          <div className="w-full h-px bg-border mb-3" />

          <div className={`flex items-center ${sidebarOpen ? "gap-2.5" : "flex-col gap-3 justify-center"}`}>
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName}
                className="w-7 h-7 rounded-full shrink-0 object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0">
                <span className="text-accent-foreground text-xs font-medium">
                  {user.displayName?.[0] ?? "?"}
                </span>
              </div>
            )}
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate leading-tight">
                  {user.displayName ?? "You"}
                </p>
              </div>
            )}
            <button onClick={logout} title="Sign out"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 md:px-8 pt-6 pb-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {PAGE_TITLES[activeNav]}
            </h1>

            {activeNav === "my-jobs" && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {typedJobs.length} application{typedJobs.length !== 1 ? "s" : ""} tracked
              </p>
            )}
            {activeNav === "opportunities" && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Browse Finance, Tech &amp; Law opportunities · powered by Trackr
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">

            {activeNav === "my-jobs" && (
              <AddJobDialog open={showAdd} onOpenChange={setShowAdd} form={form} setForm={setForm} onAdd={handleAddJob} />
            )}

            {activeNav === "my-jobs" && (
              <div className="hidden md:flex items-center bg-muted/50 rounded-lg p-0.5 border border-border shrink-0">
                <button onClick={() => setViewType('list')} className={`p-1.5 rounded-md transition-colors ${viewType === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  <List className="w-4 h-4" />
                </button>
                <button onClick={() => setViewType('grid')} className={`p-1.5 rounded-md transition-colors ${viewType === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            )}
            <button onClick={() => {
              const toggle = () => {
                const isDark = document.documentElement.classList.toggle('dark');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
                setDark(isDark);
              };
              if (!document.startViewTransition) toggle();
              else document.startViewTransition(() => toggle());
            }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out"
              title={dark ? "Light mode" : "Dark mode"}>
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ══════════════ MY JOBS ══════════════ */}
        <AnimatePresence mode="wait">

        {activeNav === "my-jobs" && (
          <motion.div
            key="my-jobs"
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            {/* Filter + Sort row */}
            <div className="px-6 md:px-8 pb-4 flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 flex-wrap flex-1 min-w-0">
                {FILTERS.map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      filter === f
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out"
                    }`}>
                    {f}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        filter === f ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      } font-mono`}>
                      {counts[f]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 shrink-0 items-center">
                {(["deadline", "salary"] as SortKey[]).map((key) => {
                  const label = sortKey !== key
                    ? (key === "deadline" ? "Sort: Deadline" : "Sort: Salary")
                    : key === "deadline"
                      ? (sortDir === "asc" ? "Deadline: Closest" : "Deadline: Furthest")
                      : (sortDir === "desc" ? "Salary: Highest" : "Salary: Lowest");
                  return (
                    <button key={key} onClick={() => handleSortClick(key)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        sortKey === key
                          ? "border-primary/40 bg-accent text-accent-foreground"
                          : "border-border text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out"
                      } font-mono`}>
                      <ArrowUpDown className="w-3 h-3" />{label}
                    </button>
                  );
                })}
                <button onClick={() => exportCSV(filtered)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out font-mono">
                  <Download className="w-3 h-3" />Export CSV
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out font-mono">
                  <Upload className="w-3 h-3" />Import CSV
                </button>
                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
              </div>
            </div>

            {/* Job list */}
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8" style={{ scrollbarWidth: "none" }}>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Briefcase className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No jobs found</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    {filter === "All" ? 'Add your first application with "+ Add Job"' : `No ${filter} applications yet`}
                  </p>
                  {filter === "All" && (
                    <button onClick={seedDemoData} className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out border border-border">
                      Load Demo Data
                    </button>
                  )}
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={viewType}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.08 }}
                    className={effectiveViewType === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12 items-start" : "job-list border border-border rounded-lg overflow-hidden"}
                  >
                    <AnimatePresence mode="popLayout">
                    {filtered.map((job, idx) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        updateJob={updateJob}
                        deleteJob={deleteJob}
                        isLast={effectiveViewType === 'grid' ? true : (idx === filtered.length - 1)}
                        isGridView={effectiveViewType === 'grid'}
                        isStealthMode={isStealthMode}
                        isMobile={isMobile}
                      />
                    ))}
                    </AnimatePresence>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}

        {/* ══════════════ CALENDAR ══════════════ */}
        {activeNav === "calendar" && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
            className="flex-1 overflow-hidden px-6 md:px-8 pb-8 pt-2"
          >
            <JobCalendar jobs={typedJobs} />
          </motion.div>
        )}

        {/* ══════════════ OPPORTUNITIES ══════════════ */}
        {activeNav === "opportunities" && (
          <motion.div
            key="opportunities"
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            <OpportunitiesTab jobs={typedJobs} addJob={addJob} />
          </motion.div>
        )}

        {/* ══════════════ SETTINGS ══════════════ */}
        {activeNav === "settings" && (
          <SettingsView
            user={user}
            dark={dark}
            setDark={setDark}
            isStealthMode={isStealthMode}
            setIsStealthMode={setIsStealthMode}
            editingName={editingName}
            setEditingName={setEditingName}
            nameInput={nameInput}
            setNameInput={setNameInput}
            savingName={savingName}
            handleSaveName={handleSaveName}
            logout={logout}
            fontFamily={fontFamily}
            setFontFamily={setFontFamily}
            density={density}
            setDensity={setDensity}
            backgroundStyle={backgroundStyle}
            setBackgroundStyle={setBackgroundStyle}
            statusColors={statusColors}
            setStatusColor={setStatusColor}
          />
        )}
        </AnimatePresence>

      </main>
      {/* Bottom Navigation (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-background dark:bg-zinc-900 border-t border-border flex justify-around items-center h-16 px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? "text-accent" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
    </div>
  );
}
