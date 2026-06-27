import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Users, ArchiveX as ArchiveIcon, Settings as SettingsIcon, Settings, Link2, Plus, LayoutGrid, List, LayoutDashboard, Lock,
  CalendarDays, X, Moon, Sun,
  ArrowUpDown, UserPlus, UserMinus, Download, Upload, LogOut, Pencil, Check, Copy, FileText, Share2,
} from "lucide-react";
import Papa from "papaparse";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuth } from "../hooks/useAuth";
import { useJobs } from "../hooks/useJobs";
import { loginWithEmail, registerWithEmail } from "../hooks/useEmailAuth";
import JobCard from "./components/JobCard";
import { useThemeSettings } from "../hooks/useThemeSettings";
import JobCalendar from "./components/JobCalendar";

import FriendsTab from "./components/FriendsTab";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "Waiting" | "Applied" | "Assessment" | "Interviewing" | "Rejected" | "Offer";
type SalaryType = "Paid" | "Volunteer";
type NavItem = "my-jobs" | "calendar" | "friends" | "docs" | "settings";
type Filter = "All" | Status;
type SortKey = "deadline" | "salary";

type Job = {
  id: string;
  company: string;
  role: string;
  status: Status;
  deadline: string;
  location: string;
  notes?: string;
  appliedDate: string;
  postingUrl?: string;
  portalUrl?: string;
  salary?: string;
  salaryType?: SalaryType;
  interviewDate?: string;
  title?: string;
  isPaid?: boolean;
  deadlines?: { signup?: string; interview?: string };
  url?: string;
  interviewQuestions?: string[];
  lessonsLearned?: string;
};

type Friend = {
  id: string;
  name: string;
  code: string;
  initials: string;
  color: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const navItems: { id: NavItem; label: string; icon: typeof Briefcase }[] = [
  { id: "my-jobs",      label: "My Jobs",     icon: Briefcase    },
  { id: "calendar",     label: "Calendar",     icon: CalendarDays },
  { id: "friends",      label: "Friends",      icon: UserPlus     },
  { id: "settings",     label: "Settings",     icon: Settings     },
];

const FILTERS: Filter[] = ["All", "Applied", "Waiting", "Assessment", "Interviewing", "Rejected", "Offer"];
const STATUSES: Status[] = ["Applied", "Waiting", "Assessment", "Interviewing", "Offer", "Rejected"];
const EMPTY_FORM = { company: "", role: "", location: "", status: "Applied" as Status, deadline: "", notes: "" };

const PAGE_TITLES: Record<NavItem, string> = {
  "my-jobs":      "My Jobs",
  "calendar":     "Calendar",
  "friends":      "Friends",
  "settings":     "Settings",
};

// ─── Seed data (friends/lists only — jobs come from Firestore) ────────────────





// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function parseSalary(s?: string) {
  return s ? parseInt(s.replace(/\D/g, ""), 10) || 0 : 0;
}

function exportCSV(jobs: Job[]) {
  const headers = ["Company", "Title", "Status", "Paid", "Salary", "Deadline", "Interview", "URL", "Notes"];
  const esc = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const rows = jobs.map((j) =>
    [
      j.company,
      j.title ?? j.role,
      j.status,
      j.isPaid ? "Yes" : (j.salaryType === "Paid" ? "Yes" : "No"),
      j.salary ?? "",
      j.deadlines?.signup ?? j.deadline ?? "",
      j.deadlines?.interview ?? j.interviewDate ?? "",
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

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2.5 font-mono">
      {children}
    </p>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExpanded(true);
    }, 400); // slight delay before expanding
    return () => clearTimeout(timer);
  }, []);


  const getBgClass = (style: string) => {
    if (style === 'grid') return "bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]";
    if (style === 'diagonal') return "bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.05)_10px,rgba(0,0,0,0.05)_20px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]";
    if (style === 'plus') return "bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]";
    if (style === 'mesh') return "bg-[radial-gradient(ellipse_at_center,transparent_0%,#80808011_100%)] bg-[size:10px_10px]";
    if (style === 'waves') return "bg-[repeating-radial-gradient(circle_at_0_0,transparent_0,#80808011_10px,transparent_20px)]";
    if (style === 'zigzag') return "bg-[linear-gradient(135deg,#80808011_25%,transparent_25%),linear-gradient(225deg,#80808011_25%,transparent_25%),linear-gradient(45deg,#80808011_25%,transparent_25%),linear-gradient(315deg,#80808011_25%,transparent_25%)] bg-[size:20px_20px] bg-[position:10px_0,10px_0,0_0,0_0]";
    
    if (style === 'boxes') return "bg-[linear-gradient(#80808011_1px,transparent_1px),linear-gradient(90deg,#80808011_1px,transparent_1px)] bg-[size:30px_30px]";
    if (style === 'weave') return "bg-[linear-gradient(45deg,#80808011_25%,transparent_25%),linear-gradient(-45deg,#80808011_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#80808011_75%),linear-gradient(-45deg,transparent_75%,#80808011_75%)] bg-[size:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]";
    if (style === 'lines') return "bg-[repeating-linear-gradient(0deg,transparent,transparent_9px,#80808011_10px)]";
    if (style === 'paper') return "bg-[linear-gradient(transparent_95%,#80808011_100%)] bg-[size:100%_2rem]";
    if (style === 'blueprint') return "bg-[#0f172a] bg-[linear-gradient(#1e293b_1px,transparent_1px),linear-gradient(90deg,#1e293b_1px,transparent_1px)] bg-[size:20px_20px]";
    if (style === 'isometric') return "bg-[linear-gradient(30deg,#80808011_1px,transparent_1px),linear-gradient(150deg,#80808011_1px,transparent_1px)] bg-[size:20px_34.64px]";
    if (style === 'glow') return "bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.15),transparent_50%),radial-gradient(circle_at_50%_100%,rgba(120,119,198,0.15),transparent_50%)]";
    if (style === 'aurora') return "bg-[radial-gradient(circle_at_0%_0%,rgba(120,119,198,0.15),transparent_50%),radial-gradient(circle_at_100%_100%,rgba(255,100,200,0.15),transparent_50%),radial-gradient(circle_at_100%_0%,rgba(100,255,200,0.15),transparent_50%)]";
    
    return "";
  };

  return (
    <div className="size-full flex items-center justify-center bg-background"
         >
      <div className={`h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${expanded ? "w-24" : "w-10"}`}>
        <div className="flex items-center justify-center select-none font-bold text-base text-primary-foreground">
          <span>J</span>
          <div className={`flex items-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${expanded ? "max-w-[60px] opacity-100 translate-x-0" : "max-w-0 opacity-0 -translate-x-4"}`}>
            <span className="tracking-tight pl-0.5">ATE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/configuration-not-found": "Google Sign-In isn't enabled. In Firebase Console go to Authentication → Sign-in method → Google and enable it.",
  "auth/invalid-email": "Invalid email address.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-not-found": "No account found with that email.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
};

function LoginScreen({
  onGoogleLogin,
  onEmailLogin,
  onEmailRegister,
}: {
  onGoogleLogin: () => Promise<void>;
  onEmailLogin: (email: string, password: string) => Promise<void>;
  onEmailRegister: (email: string, password: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<"google" | "email">("google");
  const [emailMode, setEmailMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  function friendlyError(code: string) {
    return AUTH_ERROR_MESSAGES[code] ?? `Sign-in failed (${code || "unknown error"}).`;
  }

  async function handleGoogle() {
    setAuthError(null);
    setSigning(true);
    try {
      await onGoogleLogin();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code !== "auth/popup-closed-by-user") setAuthError(friendlyError(code));
    } finally {
      setSigning(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setSigning(true);
    try {
      if (emailMode === "signin") {
        await onEmailLogin(email, password);
      } else {
        await onEmailRegister(email, password);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      setAuthError(friendlyError(code));
    } finally {
      setSigning(false);
    }
  }


  const getBgClass = (style: string) => {
    if (style === 'grid') return "bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]";
    if (style === 'diagonal') return "bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.05)_10px,rgba(0,0,0,0.05)_20px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]";
    if (style === 'plus') return "bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]";
    if (style === 'mesh') return "bg-[radial-gradient(ellipse_at_center,transparent_0%,#80808011_100%)] bg-[size:10px_10px]";
    if (style === 'waves') return "bg-[repeating-radial-gradient(circle_at_0_0,transparent_0,#80808011_10px,transparent_20px)]";
    if (style === 'zigzag') return "bg-[linear-gradient(135deg,#80808011_25%,transparent_25%),linear-gradient(225deg,#80808011_25%,transparent_25%),linear-gradient(45deg,#80808011_25%,transparent_25%),linear-gradient(315deg,#80808011_25%,transparent_25%)] bg-[size:20px_20px] bg-[position:10px_0,10px_0,0_0,0_0]";
    
    if (style === 'boxes') return "bg-[linear-gradient(#80808011_1px,transparent_1px),linear-gradient(90deg,#80808011_1px,transparent_1px)] bg-[size:30px_30px]";
    if (style === 'weave') return "bg-[linear-gradient(45deg,#80808011_25%,transparent_25%),linear-gradient(-45deg,#80808011_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#80808011_75%),linear-gradient(-45deg,transparent_75%,#80808011_75%)] bg-[size:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]";
    if (style === 'lines') return "bg-[repeating-linear-gradient(0deg,transparent,transparent_9px,#80808011_10px)]";
    if (style === 'paper') return "bg-[linear-gradient(transparent_95%,#80808011_100%)] bg-[size:100%_2rem]";
    if (style === 'blueprint') return "bg-[#0f172a] bg-[linear-gradient(#1e293b_1px,transparent_1px),linear-gradient(90deg,#1e293b_1px,transparent_1px)] bg-[size:20px_20px]";
    if (style === 'isometric') return "bg-[linear-gradient(30deg,#80808011_1px,transparent_1px),linear-gradient(150deg,#80808011_1px,transparent_1px)] bg-[size:20px_34.64px]";
    if (style === 'glow') return "bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.15),transparent_50%),radial-gradient(circle_at_50%_100%,rgba(120,119,198,0.15),transparent_50%)]";
    if (style === 'aurora') return "bg-[radial-gradient(circle_at_0%_0%,rgba(120,119,198,0.15),transparent_50%),radial-gradient(circle_at_100%_100%,rgba(255,100,200,0.15),transparent_50%),radial-gradient(circle_at_100%_0%,rgba(100,255,200,0.15),transparent_50%)]";
    
    return "";
  };

  return (
    <div className="size-full flex items-center justify-center bg-background"
         >
      <div className="flex flex-col items-center gap-6 text-center max-w-sm w-full px-6">
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-sm">
          <span className="text-primary-foreground text-2xl font-bold leading-none">J</span>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">JATE</h1>
          <p className="text-sm text-muted-foreground mt-1">Job Application Tracker</p>
        </div>

        {/* Tab toggle */}
        <div className="flex w-full p-0.5 bg-muted rounded-lg">
          {(["google", "email"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setAuthError(null); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {t === "google" ? "Google" : "Email"}
            </button>
          ))}
        </div>

        {/* Error */}
        {authError && (
          <div className="w-full px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-left">
            <p className="text-xs font-medium text-red-700 mb-0.5">
              {emailMode === "register" && tab === "email" ? "Registration error" : "Sign-in error"}
            </p>
            <p className="text-xs text-red-600 leading-relaxed">{authError}</p>
          </div>
        )}

        {/* Google tab */}
        {tab === "google" && (
          <button onClick={handleGoogle} disabled={signing}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
            {signing ? (
              <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            {signing ? "Signing in…" : "Sign in with Google"}
          </button>
        )}

        {/* Email tab */}
        {tab === "email" && (
          <form onSubmit={handleEmailSubmit} className="w-full flex flex-col gap-3">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-medium text-foreground">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-medium text-foreground">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={emailMode === "register" ? "Min. 6 characters" : "••••••••"} required
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <button type="submit" disabled={signing || !email || !password}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {signing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {signing ? "Please wait…" : emailMode === "signin" ? "Sign In" : "Create Account"}
            </button>
            <button type="button"
              onClick={() => { setEmailMode(emailMode === "signin" ? "register" : "signin"); setAuthError(null); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {emailMode === "signin"
                ? "Don't have an account? Create one"
                : "Already have an account? Sign in"}
            </button>
          </form>
        )}

        <p className="text-[11px] text-muted-foreground">
          Your data is private and only shared with friends you invite.
        </p>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  useEffect(() => {
    // Initialize theme and accent color on app load
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
    const savedAccent = localStorage.getItem('accentColor');
    if (savedAccent) {
      document.documentElement.style.setProperty('--accent-hex', savedAccent);
    }
  }, []);
  const { user, loading, loginWithGoogle, logout } = useAuth();
  const { jobs, addJob, updateJob, deleteJob } = useJobs(user?.uid ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dark, setDark] = useState(false);
  const { fontFamily, density, backgroundStyle, statusColors, setFontFamily, setDensity, setBackgroundStyle, setStatusColor } = useThemeSettings();

  const [activeNav, setActiveNav] = useState<NavItem>("my-jobs");
  const [isStealthMode, setIsStealthMode] = useState(() => localStorage.getItem("stealthMode") === "true");

  useEffect(() => {
    localStorage.setItem("stealthMode", String(isStealthMode));
  }, [isStealthMode]);

  const [viewType, setViewType] = useState<"list" | "grid">("list");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const effectiveViewType = isMobile ? 'grid' : viewType;
  const [copiedIcal, setCopiedIcal] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());

  // My Jobs UI state
  const [filter, setFilter] = useState<Filter>("All");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");



  // Sidebar quick-join
  const [friendCode, setFriendCode] = useState("");

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
            const statusStr = row.Status || "Applied";
            const isPaid = row.Paid === "Yes";
            await addJob({
              company: row.Company,
              role: row.Title || "",
              status: ["Applied", "Waiting", "Assessment", "Interviewing", "Offer", "Rejected"].includes(statusStr) ? statusStr as Status : "Applied",
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
      {
        company: "Stripe",
        role: "Product Designer",
        location: "Remote",
        status: "Applied",
        deadline: "2026-07-30",
        appliedDate: "2026-06-10",
        postingUrl: "stripe.com/jobs/product-designer-2026",
        portalUrl: "jobs.lever.co/stripe/apply/pd",
        salary: "110000",
        salaryType: "Paid",
        notes: "Found via LinkedIn. Strong interest in payments UX.",
      },
      {
        company: "Airbnb",
        role: "Data Analyst",
        location: "San Francisco, CA",
        status: "Rejected",
        deadline: "2026-06-20",
        appliedDate: "2026-05-15",
      },
      {
        company: "Linear",
        role: "Growth Engineer",
        location: "Remote",
        status: "Waiting",
        deadline: "2026-08-01",
        appliedDate: "2026-06-18",
      },
      {
        company: "Notion",
        role: "Product Manager",
        location: "New York, NY",
        status: "Interviewing",
        deadline: "2026-07-22",
        appliedDate: "2026-06-05",
      }
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

  async function updatePrivacy(uid: string, isPublic: boolean) {
    try {
      await updateDoc(doc(db, "users", uid), { isPublic });
    } catch (e) {
      console.error("Error updating privacy:", e);
    }
  }

  // ── Display name update ─────────────────────────────────────────────────────

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === user.displayName) { setEditingName(false); return; }
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser!, { displayName: trimmed });
      await updateDoc(doc(db, "users", user.uid), { displayName: trimmed });
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


  // Derived data for agenda
  const agendaJobs = typedJobs
    .filter((j) => j.status !== 'Archived')
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


  const getBgClass = (style: string) => {
    if (style === 'grid') return "bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]";
    if (style === 'diagonal') return "bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.05)_10px,rgba(0,0,0,0.05)_20px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]";
    if (style === 'plus') return "bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]";
    if (style === 'mesh') return "bg-[radial-gradient(ellipse_at_center,transparent_0%,#80808011_100%)] bg-[size:10px_10px]";
    if (style === 'waves') return "bg-[repeating-radial-gradient(circle_at_0_0,transparent_0,#80808011_10px,transparent_20px)]";
    if (style === 'zigzag') return "bg-[linear-gradient(135deg,#80808011_25%,transparent_25%),linear-gradient(225deg,#80808011_25%,transparent_25%),linear-gradient(45deg,#80808011_25%,transparent_25%),linear-gradient(315deg,#80808011_25%,transparent_25%)] bg-[size:20px_20px] bg-[position:10px_0,10px_0,0_0,0_0]";
    
    if (style === 'boxes') return "bg-[linear-gradient(#80808011_1px,transparent_1px),linear-gradient(90deg,#80808011_1px,transparent_1px)] bg-[size:30px_30px]";
    if (style === 'weave') return "bg-[linear-gradient(45deg,#80808011_25%,transparent_25%),linear-gradient(-45deg,#80808011_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#80808011_75%),linear-gradient(-45deg,transparent_75%,#80808011_75%)] bg-[size:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]";
    if (style === 'lines') return "bg-[repeating-linear-gradient(0deg,transparent,transparent_9px,#80808011_10px)]";
    if (style === 'paper') return "bg-[linear-gradient(transparent_95%,#80808011_100%)] bg-[size:100%_2rem]";
    if (style === 'blueprint') return "bg-[#0f172a] bg-[linear-gradient(#1e293b_1px,transparent_1px),linear-gradient(90deg,#1e293b_1px,transparent_1px)] bg-[size:20px_20px]";
    if (style === 'isometric') return "bg-[linear-gradient(30deg,#80808011_1px,transparent_1px),linear-gradient(150deg,#80808011_1px,transparent_1px)] bg-[size:20px_34.64px]";
    if (style === 'glow') return "bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.15),transparent_50%),radial-gradient(circle_at_50%_100%,rgba(120,119,198,0.15),transparent_50%)]";
    if (style === 'aurora') return "bg-[radial-gradient(circle_at_0%_0%,rgba(120,119,198,0.15),transparent_50%),radial-gradient(circle_at_100%_100%,rgba(255,100,200,0.15),transparent_50%),radial-gradient(circle_at_100%_0%,rgba(100,255,200,0.15),transparent_50%)]";
    
    return "";
  };

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
      <aside className="hidden md:flex flex-col w-[220px] shrink-0 bg-secondary/30 backdrop-blur-md border-r border-border h-full">
        {/* JATE logo */}
        <div className="px-4 pt-5 pb-4 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground text-sm font-bold leading-none">J</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-tight text-foreground leading-tight">JATE</p>
            <p className="text-[9px] text-muted-foreground leading-tight truncate">Job Application Tracker</p>
          </div>
        </div>

        <div className="w-full h-px bg-border" />

        <nav className="flex flex-col gap-0.5 px-3 pt-3 flex-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveNav(id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm w-full text-left transition-colors ${
                activeNav === id
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out"
              }`}>
              <Icon className="w-4 h-4 shrink-0" />{label}
            </button>
          ))}

          {agendaJobs.length > 0 && (
            <div className="mt-6 mb-2">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Upcoming Agenda</h3>
              <div className="flex flex-col gap-0.5">
                {agendaJobs.map(j => (
                  <button 
                    key={j.id} 
                    onClick={() => {
                      setActiveNav('my-jobs');
                      setFilter('All');
                      // We could theoretically scroll to it, but just setting view is a good start
                    }}
                    className="flex flex-col gap-0.5 px-3 py-2 rounded-md text-left transition-colors hover:bg-muted active:scale-95 group"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${j.isInterview ? 'bg-accent' : 'bg-blue-500'}`} />
                      <span className="text-xs font-medium text-foreground truncate group-hover:text-accent-foreground transition-colors">{j.company} - {j.role || j.title}</span>
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

        {/* User profile + quick-join */}
        <div className="px-4 pb-5 pt-3">
          <div className="w-full h-px bg-border mb-3" />

          {/* Signed-in user */}
          <div className="flex items-center gap-2.5 mb-3">
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
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate leading-tight">
                {user.displayName ?? "You"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate leading-tight font-mono">
                {user.friendCode ?? ""}
              </p>
            </div>
            <button onClick={logout} title="Sign out"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-full h-px bg-border mb-3" />

          <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
            <Link2 className="w-3 h-3" />Friend Code
          </p>
          <p className="text-[11px] text-muted-foreground mb-2.5 leading-relaxed">
            Enter a code to view a shared list.
          </p>
          <div className="flex gap-1.5">
            <input type="text" value={friendCode} onChange={(e) => setFriendCode(e.target.value)}
              placeholder="e.g. jt-a9x2"
              className="flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-md border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono" />
            <button onClick={() => setFriendCode("")}
              className="px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-95 transition-all duration-200 ease-in-out shrink-0">
              Join
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 md:px-8 pt-6 pb-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {PAGE_TITLES[activeNav]}
            </h1>

        {activeNav === "my-jobs" && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {typedJobs.length} application{typedJobs.length !== 1 ? "s" : ""} tracked
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">

        {activeNav === "my-jobs" && (
              <button onClick={() => { setSelectMode(!selectMode); setSelectedJobs(new Set()); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-opacity border ${selectMode ? 'bg-accent text-accent-foreground border-accent' : 'bg-transparent text-foreground border-border hover:bg-muted'}`}>
                {selectMode ? 'Cancel' : 'Select'}
              </button>
            )}

        {activeNav === "my-jobs" && (
              <Dialog.Root open={showAdd} onOpenChange={setShowAdd}>
                <Dialog.Trigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                    <Plus className="w-4 h-4" />Add Job
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/25 backdrop-blur-[1px] z-40" />
                  <Dialog.Content
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card/30 backdrop-blur-md rounded-xl border border-border shadow-xl p-6 focus:outline-none"
                    >
                    <div className="flex items-center justify-between mb-5">
                      <Dialog.Title className="text-base font-semibold text-foreground">Add Application</Dialog.Title>
                      <Dialog.Close className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out">
                        <X className="w-4 h-4" />
                      </Dialog.Close>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-foreground">Company *</label>
                          <input type="text" value={form.company}
                            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                            placeholder="Acme Corp"
                            className="px-3 py-2 rounded-md border border-border bg-input-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-foreground">Role *</label>
                          <input type="text" value={form.role}
                            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                            placeholder="Software Engineer"
                            className="px-3 py-2 rounded-md border border-border bg-input-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-foreground">Location</label>
                          <input type="text" value={form.location}
                            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                            placeholder="Remote"
                            className="px-3 py-2 rounded-md border border-border bg-input-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-foreground">Status</label>
                          <select value={form.status}
                            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Status }))}
                            className="px-3 py-2 rounded-md border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-foreground">Application Deadline</label>
                        <input type="date" value={form.deadline}
                          onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                          className="px-3 py-2 rounded-md border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-foreground">Notes</label>
                        <textarea value={form.notes}
                          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                          placeholder="Referral from Jane, recruiter contact..."
                          rows={3}
                          className="px-3 py-2 rounded-md border border-border bg-input-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-border">
                      <Dialog.Close asChild>
                        <button className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out">
                          Cancel
                        </button>
                      </Dialog.Close>
                      <button onClick={handleAddJob}
                        disabled={!form.company.trim() || !form.role.trim()}
                        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                        Add Application
                      </button>
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
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

        {/* ══════════════ FRIENDS & SHARED GROUPS ══════════════ */}
        {activeNav === "friends" && (
          <motion.div key="friends" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col h-full overflow-hidden">
            <FriendsTab userId={user.uid} />
          </motion.div>
        )}



        {/* ══════════════ SETTINGS ══════════════ */}
        {activeNav === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
            className="flex-1 overflow-y-auto px-6 md:px-8 pb-24 pt-4"
          >
            <div className="max-w-xl mx-auto flex flex-col gap-8">
              
              {/* Profile Section */}
              <div>
                <h2 className="text-xl font-semibold mb-6 text-foreground">Profile Settings</h2>
                <div className="border border-border rounded-lg divide-y divide-border overflow-hidden bg-card/30 backdrop-blur-md shadow-sm">
                  {/* Display name */}
                  <div className="flex items-center justify-between px-5 py-4 gap-3">
                    <span className="text-sm text-muted-foreground shrink-0">Display name</span>
                    {editingName ? (
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <input
                          autoFocus
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                          className="flex-1 max-w-[200px] px-2.5 py-1 rounded-md border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring text-right"
                        />
                        <button onClick={handleSaveName} disabled={savingName}
                          className="p-1.5 rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setEditingName(false); setNameInput(user.displayName ?? ""); }}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{user.displayName ?? "—"}</span>
                        <button onClick={() => { setEditingName(true); setNameInput(user.displayName ?? ""); }}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Email */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm font-medium text-foreground">{user.email ?? "—"}</span>
                  </div>
                  {/* Share code */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <span className="text-sm text-muted-foreground">Your share code</span>
                    <span className="text-sm font-medium text-foreground font-mono">
                      {user.friendCode ?? "—"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Share your code with friends so they can view your job list.
                </p>
              </div>

                            {/* Privacy Section */}
              <div>
                <h2 className="text-xl font-semibold mb-6 text-foreground">Privacy</h2>
                <div className="bg-card/30 backdrop-blur-md rounded-lg border border-border flex flex-col shadow-sm divide-y divide-border">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Public Profile</h3>
                      <p className="text-xs text-muted-foreground mt-1">Allow friends to view my personal job board.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={user?.isPublic !== false} onChange={(e) => updatePrivacy(user.uid, e.target.checked)} />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-foreground" />
                        <h3 className="text-sm font-medium text-foreground">Stealth Mode</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">Blur sensitive details (Salary, Location, Notes, Links) until hovered.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={isStealthMode} onChange={(e) => setIsStealthMode(e.target.checked)} />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>
                </div>
              </div>


              
              {/* Appearance Section */}
              <div>
                <h2 className="text-xl font-semibold mb-6 text-foreground">Appearance</h2>
                <div className="border border-border rounded-lg divide-y divide-border overflow-hidden bg-card/30 backdrop-blur-md shadow-sm">
                  {/* Dark Mode */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Dark Mode</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Toggle OLED dark mode</p>
                    </div>
                    <button
                      onClick={() => {
                        const toggle = () => {
                          const isDark = document.documentElement.classList.toggle('dark');
                          localStorage.setItem('theme', isDark ? 'dark' : 'light');
                          setDark(isDark);
                        };
                        if (!document.startViewTransition) toggle();
                        else document.startViewTransition(() => toggle());
                      }}
                      className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-95 transition-all duration-200 ease-in-out flex items-center gap-2"
                    >
                      <Moon className="w-4 h-4 hidden dark:block" />
                      <Sun className="w-4 h-4 block dark:hidden" />
                      Toggle Theme
                    </button>
                  </div>
                  {/* Accent Color */}
                  <div className="flex flex-col gap-4 px-5 py-4">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Accent Color</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Customize your app's primary color</p>
                    </div>
                    <div className="flex flex-col gap-3">
                      {[
                        { label: "Generic", colors: ["#3b82f6", "#a855f7", "#ef4444", "#22c55e", "#f59e0b"] },
                        { label: "Pastel", colors: ["#fbcfe8", "#a7f3d0", "#ddd6fe", "#fcd34d", "#bbf7d0"] },
                        { label: "Muted", colors: ["#64748b", "#78716c", "#71717a", "#737373", "#57534e"] }
                      ].map(group => (
                        <div key={group.label} className="flex items-center gap-3">
                          <span className="text-xs font-medium text-muted-foreground w-14">{group.label}</span>
                          <div className="flex gap-2">
                            {group.colors.map(color => (
                              <button
                                key={color}
                                onClick={() => {
                                  document.documentElement.style.setProperty('--accent-hex', color);
                                  localStorage.setItem('accentColor', color);
                                }}
                                className="w-6 h-6 rounded-full cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Aesthetics Engine Section */}
              <div>
                <h2 className="text-xl font-semibold mb-6 text-foreground">Aesthetics Engine</h2>
                <div className="border border-border rounded-lg divide-y divide-border overflow-hidden bg-card/30 backdrop-blur-md shadow-sm">
                  {/* Typography */}
                  <div className="flex items-center justify-between px-5 py-4 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Typography</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Select your preferred font family</p>
                    </div>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value as any)}
                      className="px-3 py-1.5 rounded-md border border-border bg-input-background text-sm text-foreground focus:outline-none"
                    >
                      <option value="sans">Sans Serif (Inter)</option>
                      <option value="mono">Monospace (JetBrains)</option>
                      <option value="serif">Serif (Merriweather)</option>
                      <option value="outfit">Sans Serif (Outfit)</option>
                      <option value="roboto">Sans Serif (Roboto)</option>
                      <option value="playfair">Serif (Playfair Display)</option>
                      <option value="comic">Comic Neue</option>
                      <option value="bricolage">Bricolage Grotesque</option>
                      <option value="cinzel">Cinzel</option>
                      <option value="lobster">Lobster</option>
                    </select>
                  </div>
                  {/* Background Style */}
                  <div className="flex flex-col gap-4 px-5 py-4">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Background Style</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Customize the app background</p>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mt-1">
                      {[
                        { id: 'solid', title: 'Solid Color' },
                        { id: 'grid', title: 'Dotted Grid' },
                        { id: 'animated', title: 'Static Orbs' },
                        { id: 'diagonal', title: 'Diagonal Stripes' },
                        { id: 'plus', title: 'Plus Grid' },
                        { id: 'mesh', title: 'Mesh Pattern' },
                        { id: 'waves', title: 'Waves Pattern' },
                        { id: 'zigzag', title: 'Zigzag Pattern' },
                        { id: 'boxes', title: 'Boxes' },
                        { id: 'weave', title: 'Woven Pattern' },
                        { id: 'lines', title: 'Horizontal Lines' },
                        { id: 'paper', title: 'Lined Paper' },
                        { id: 'blueprint', title: 'Blueprint' },
                        { id: 'isometric', title: 'Isometric Grid' },
                        { id: 'glow', title: 'Neon Glow' },
                        { id: 'aurora', title: 'Aurora' },
                      ].map(bg => (
                        <button
                          key={bg.id}
                          title={bg.title}
                          onClick={() => setBackgroundStyle(bg.id as any)}
                          className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                            backgroundStyle === bg.id 
                              ? 'border-primary ring-2 ring-primary/20 shadow-md' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className={`absolute inset-0 bg-background ${getBgClass(bg.id)}`}></div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Custom Status Colors */}
                  <div className="flex flex-col gap-4 px-5 py-4">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Status Colors</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Assign custom colors to job statuses</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                      {STATUSES.map(status => (
                        <div key={status} className="flex items-center gap-3">
                          <input
                            type="color"
                            value={statusColors[status] || "#000000"}
                            onChange={(e) => setStatusColor(status, e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border-none p-0 appearance-none bg-transparent"
                          />
                          <span className="text-sm font-medium text-foreground">{status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* External Calendar Sync */}
              <div>
                <h2 className="text-xl font-semibold mb-6 text-foreground">External Calendar Sync</h2>
                <div className="bg-card/30 backdrop-blur-md rounded-lg border border-border p-5 flex flex-col gap-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Subscribe via iCal</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Paste this link into Google Calendar (Other Calendars → From URL) or Apple Calendar to sync your application tracking timeline automatically.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={`${window.location.origin}/api/calendar?user=${user.uid}`}
                      className="flex-1 px-3 py-2 rounded-md border border-border bg-input-background text-sm text-muted-foreground focus:outline-none font-mono text-xs overflow-hidden text-ellipsis"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/calendar?user=${user.uid}`);
                        setCopiedIcal(true);
                        setTimeout(() => setCopiedIcal(false), 2000);
                      }}
                      className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap"
                    >
                      {copiedIcal ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedIcal ? "Copied!" : "Copy Link"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <button onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors w-fit dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 border border-red-100 dark:border-red-900/30">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>

              </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Bulk Share FAB */}
        {activeNav === "my-jobs" && selectMode && selectedJobs.size > 0 && (
          <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-40">
            <button onClick={handleBulkShare} className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-accent-foreground shadow-lg hover:opacity-90 transition-opacity font-medium">
              <Share2 className="w-4 h-4" />
              Share {selectedJobs.size} Selected {selectedJobs.size === 1 ? 'Job' : 'Jobs'}
            </button>
          </div>
        )}

      </main>
      {/* Bottom Navigation (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-background dark:bg-zinc-900 border-t border-border flex justify-around items-center h-16 px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
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
