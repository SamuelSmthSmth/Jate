import { useState } from "react";

const AUTH_ERROR_MESSAGES: Array<[string, string]> = [
  ["Invalid login credentials", "Incorrect email or password."],
  ["Email not confirmed", "Please check your email to confirm your account, then sign in."],
  ["User already registered", "An account with this email already exists. Try signing in instead."],
  ["Password should be at least", "Password must be at least 6 characters."],
  ["Unable to validate email", "Invalid email address."],
  ["Email rate limit exceeded", "Too many attempts. Please wait a moment and try again."],
];

export default function LoginScreen({
  onGoogleLogin,
  onEmailLogin,
  onEmailRegister,
}: {
  onGoogleLogin: () => Promise<any>;
  onEmailLogin: (email: string, password: string) => Promise<any>;
  onEmailRegister: (email: string, password: string) => Promise<any>;
}) {
  const [tab, setTab] = useState<"google" | "email">("google");
  const [emailMode, setEmailMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  function friendlyError(err: unknown) {
    const message = (err as { message?: string })?.message ?? "";
    for (const [needle, friendly] of AUTH_ERROR_MESSAGES) {
      if (message.includes(needle)) return friendly;
    }
    return message || "Sign-in failed (unknown error).";
  }

  async function handleGoogle() {
    setAuthError(null);
    setSigning(true);
    try {
      await onGoogleLogin();
    } catch (err: unknown) {
      setAuthError(friendlyError(err));
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
      setAuthError(friendlyError(err));
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="size-full flex items-center justify-center bg-background">
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
          Your data is private and stored securely.
        </p>
      </div>
    </div>
  );
}
