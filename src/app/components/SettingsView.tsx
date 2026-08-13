import { motion } from "framer-motion";
import { Lock, Moon, Sun, LogOut, Check, X, Pencil } from "lucide-react";
import { getBgClass, BACKGROUND_OPTIONS } from "../../lib/backgrounds";
import { Status, STATUSES } from "../types";
import { FontFamily, BackgroundStyle } from "../../hooks/useThemeSettings";

type SettingsViewProps = {
  user: { displayName: string | null; email: string | null };
  dark: boolean;
  setDark: (d: boolean) => void;
  isStealthMode: boolean;
  setIsStealthMode: (v: boolean) => void;
  editingName: boolean;
  setEditingName: (v: boolean) => void;
  nameInput: string;
  setNameInput: (v: string) => void;
  savingName: boolean;
  handleSaveName: () => void;
  logout: () => void;
  fontFamily: FontFamily;
  setFontFamily: (f: FontFamily) => void;
  backgroundStyle: BackgroundStyle;
  setBackgroundStyle: (s: BackgroundStyle) => void;
  statusColors: Record<Status, string>;
  setStatusColor: (s: Status, c: string) => void;
};

export default function SettingsView({
  user,
  dark,
  setDark,
  isStealthMode,
  setIsStealthMode,
  editingName,
  setEditingName,
  nameInput,
  setNameInput,
  savingName,
  handleSaveName,
  logout,
  fontFamily,
  setFontFamily,
  backgroundStyle,
  setBackgroundStyle,
  statusColors,
  setStatusColor,
}: SettingsViewProps) {
  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
      className="flex-1 overflow-y-auto px-6 md:px-8 pb-24 pt-4"
    >
      <div className="max-w-xl mx-auto flex flex-col gap-8">
        {/* Profile Section */}
        <div>
          <h2 className="text-xl font-semibold mb-6 text-foreground">Profile Settings</h2>
          <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-card shadow-sm">
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
          </div>
        </div>

        {/* Privacy Section */}
        <div>
          <h2 className="text-xl font-semibold mb-6 text-foreground">Privacy</h2>
          <div className="bg-card rounded-xl border border-border flex flex-col shadow-sm divide-y divide-border">
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
          <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-card shadow-sm">
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
          <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-card shadow-sm">
            {/* Typography */}
            <div className="flex items-center justify-between px-5 py-4 gap-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">Typography</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Select your preferred font family</p>
              </div>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as FontFamily)}
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
                {BACKGROUND_OPTIONS.map(bg => (
                  <button
                    key={bg.id}
                    title={bg.title}
                    onClick={() => setBackgroundStyle(bg.id as BackgroundStyle)}
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

        <div className="pt-4 border-t border-border">
          <button onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors w-fit dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 border border-red-100 dark:border-red-900/30">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </motion.div>
  );
}
