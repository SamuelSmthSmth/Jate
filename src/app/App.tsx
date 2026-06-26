import { useState } from "react";
import {
  Briefcase, Users, Settings, Link2, Plus,
  CalendarDays, X, Moon, Sun,
  ArrowUpDown, UserPlus, UserMinus, Download, LogOut, Pencil, Check,
} from "lucide-react";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuth } from "../hooks/useAuth";
import { useJobs } from "../hooks/useJobs";
import { loginWithEmail, registerWithEmail } from "../hooks/useEmailAuth";
import JobCard from "./components/JobCard";
import JobCalendar from "./components/JobCalendar";
import FriendsTab from "./components/FriendsTab";
import SharedListsTab from "./components/SharedListsTab";
import JobCalendar from "./components/JobCalendar";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "Waiting" | "Applied" | "Assessment" | "Interviewing" | "Rejected" | "Offer";
type SalaryType = "Paid" | "Volunteer";
type NavItem = "my-jobs" | "calendar" | "friends" | "shared-lists" | "settings";
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
};

type Friend = {
  id: string;
  name: string;
  code: string;
  initials: string;
  color: string;
};

type SharedList = {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const navItems: { id: NavItem; label: string; icon: typeof Briefcase }[] = [
  { id: "my-jobs",      label: "My Jobs",     icon: Briefcase    },
  { id: "calendar",     label: "Calendar",     icon: CalendarDays },
  { id: "friends",      label: "Friends",      icon: UserPlus     },
  { id: "shared-lists", label: "Shared Lists", icon: Users        },
  { id: "settings",     label: "Settings",     icon: Settings     },
];

const FILTERS: Filter[] = ["All", "Applied", "Waiting", "Assessment", "Interviewing", "Rejected", "Offer"];
const STATUSES: Status[] = ["Applied", "Waiting", "Assessment", "Interviewing", "Offer", "Rejected"];
const EMPTY_FORM = { company: "", role: "", location: "", status: "Applied" as Status, deadline: "", notes: "" };

const PAGE_TITLES: Record<NavItem, string> = {
  "my-jobs":      "My Jobs",
  "calendar":     "Calendar",
  "friends":      "Friends & Shared Groups",
  "shared-lists": "Shared Lists",
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
    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2.5"
       style={{ fontFamily: "'Geist Mono', monospace" }}>
      {children}
    </p>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="size-full flex items-center justify-center bg-background"
         style={{ fontFamily: "'Geist', sans-serif" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-base font-bold">J</span>
        </div>
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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

  return (
    <div className="size-full flex items-center justify-center bg-background"
         style={{ fontFamily: "'Geist', sans-serif" }}>
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
  const { user, loading, loginWithGoogle, logout } = useAuth();
  const { jobs, addJob, updateJob, deleteJob } = useJobs(user?.uid ?? null);

  const [dark, setDark] = useState(false);
  const [activeNav, setActiveNav] = useState<NavItem>("my-jobs");

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

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={`size-full flex overflow-hidden bg-background text-foreground${dark ? " dark" : ""}`}
         style={{ fontFamily: "'Geist', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col w-[220px] shrink-0 bg-secondary border-r border-border h-full">
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
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}>
              <Icon className="w-4 h-4 shrink-0" />{label}
            </button>
          ))}
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
              <p className="text-[10px] text-muted-foreground truncate leading-tight"
                 style={{ fontFamily: "'Geist Mono', monospace" }}>
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
              className="flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-md border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              style={{ fontFamily: "'Geist Mono', monospace" }} />
            <button onClick={() => setFriendCode("")}
              className="px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity shrink-0">
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
              <Dialog.Root open={showAdd} onOpenChange={setShowAdd}>
                <Dialog.Trigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                    <Plus className="w-4 h-4" />Add Job
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/25 backdrop-blur-[1px] z-40" />
                  <Dialog.Content
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card rounded-xl border border-border shadow-xl p-6 focus:outline-none"
                    style={{ fontFamily: "'Geist', sans-serif" }}>
                    <div className="flex items-center justify-between mb-5">
                      <Dialog.Title className="text-base font-semibold text-foreground">Add Application</Dialog.Title>
                      <Dialog.Close className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
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
                          className="px-3 py-2 rounded-md border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          style={{ fontFamily: "'Geist Mono', monospace" }} />
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
                        <button className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
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
            <button onClick={() => setDark((d) => !d)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={dark ? "Light mode" : "Dark mode"}>
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ══════════════ MY JOBS ══════════════ */}
        {activeNav === "my-jobs" && (
          <>
            {/* Filter + Sort row */}
            <div className="px-6 md:px-8 pb-4 flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 flex-wrap flex-1 min-w-0">
                {FILTERS.map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      filter === f
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}>
                    {f}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        filter === f ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      }`} style={{ fontFamily: "'Geist Mono', monospace" }}>
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
                          : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`} style={{ fontFamily: "'Geist Mono', monospace" }}>
                      <ArrowUpDown className="w-3 h-3" />{label}
                    </button>
                  );
                })}
                <button onClick={() => exportCSV(filtered)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  style={{ fontFamily: "'Geist Mono', monospace" }}>
                  <Download className="w-3 h-3" />Export CSV
                </button>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {filter === "All" ? 'Add your first application with "+ Add Job"' : `No ${filter} applications yet`}
                  </p>
                </div>
              ) : (
                <div className="job-list border border-border rounded-lg overflow-hidden">
                  {filtered.map((job, idx) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      updateJob={updateJob}
                      deleteJob={deleteJob}
                      isLast={idx === filtered.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════════ CALENDAR ══════════════ */}
        {activeNav === "calendar" && (
          <div className="flex-1 overflow-hidden px-6 md:px-8 pb-8 pt-2">
            <JobCalendar jobs={typedJobs} />
          </div>
        )}

        {/* ══════════════ FRIENDS & SHARED GROUPS ══════════════ */}
        {activeNav === "friends" && <FriendsTab userId={user.uid} />}

        {/* ══════════════ SHARED LISTS ══════════════ */}
        {activeNav === "shared-lists" && <SharedListsTab userId={user.uid} />}

        {/* ══════════════ SETTINGS ══════════════ */}
        {activeNav === "settings" && (
          <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8">
            <div className="max-w-md flex flex-col gap-4">
              <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">

                {/* Display name — editable */}
                <div className="flex items-center justify-between px-5 py-4 bg-card gap-3">
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
                        className="p-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setEditingName(false); setNameInput(user.displayName ?? ""); }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{user.displayName ?? "—"}</span>
                      <button onClick={() => { setEditingName(true); setNameInput(user.displayName ?? ""); }}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Email — read only */}
                <div className="flex items-center justify-between px-5 py-4 bg-card">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium text-foreground">{user.email ?? "—"}</span>
                </div>

                {/* Share code — read only, mono */}
                <div className="flex items-center justify-between px-5 py-4 bg-card">
                  <span className="text-sm text-muted-foreground">Your share code</span>
                  <span className="text-sm font-medium text-foreground"
                    style={{ fontFamily: "'Geist Mono', monospace" }}>
                    {user.friendCode ?? "—"}
                  </span>
                </div>

              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Share your code with friends so they can view your job list.
              </p>
              <button onClick={logout}
                className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-fit">
                <LogOut className="w-4 h-4" />Sign out
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
