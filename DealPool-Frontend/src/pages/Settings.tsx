import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ProfileEditForm } from "../components/settings/ProfileEditForm";
import {
  User,
  Shield,
  Star,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Users,
  Sparkles,
} from "lucide-react";

export function Settings() {
  const { user, isAdmin, changePassword, login } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [pwError, setPwError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);

    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }

    setPwStatus("loading");
    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      setPwStatus("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwStatus("error");
      setPwError(err || "Failed to update password.");
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#1A1A1A]">Please sign in to view settings</h2>
        <p className="text-xs text-gray-500">Sign in to edit your community profile and credentials.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--signal)]/10 text-[var(--signal)] text-xs font-bold border border-[var(--signal)]/20 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[var(--signal)]" />
          <span>Account & Identity Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--ink)] tracking-tight">
          Profile & Security
        </h1>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          Manage your verified community identity, reputation metadata, and authentication credentials.
        </p>
      </div>

      {/* Profile Edit Component */}
      <ProfileEditForm user={user} />

      {/* Security: Change Password */}
      <div className="bg-[var(--surface)] rounded-3xl p-6 sm:p-8 border border-[var(--line)] shadow-xs space-y-5">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[var(--signal)]" />
          <h3 className="font-black text-[var(--ink)] text-base">Security & Authentication</h3>
        </div>

        {user.has_password === false || user.auth_provider === "google" ? (
          <div className="flex items-start gap-3.5 bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-4 sm:p-5">
            <div className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center shrink-0 shadow-xs">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-[var(--ink)]">
                Connected via Google Authentication
              </p>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                You signed in using your Google account ({user.email}). Passwords and account security are managed directly through your Google account settings.
              </p>
            </div>
          </div>
        ) : (
          <>
            {pwStatus === "success" && (
              <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/30 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Password successfully changed.</span>
              </div>
            )}

            {pwError && (
              <div className="flex items-center gap-2 text-xs text-rose-500 bg-rose-500/10 p-3.5 rounded-xl border border-rose-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pwError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-[var(--paper)] rounded-xl text-sm text-[var(--ink)] border border-[var(--line)] focus:outline-none focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--signal)] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-[var(--paper)] rounded-xl text-sm text-[var(--ink)] border border-[var(--line)] focus:outline-none focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--signal)] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--ink)] mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-[var(--paper)] rounded-xl text-sm text-[var(--ink)] border border-[var(--line)] focus:outline-none focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--signal)] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={pwStatus === "loading"}
                className="px-6 py-2.5 bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {pwStatus === "loading" ? "Updating..." : "Update Password"}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Dev-only: Instant Profile Switcher — tree-shaken from production builds */}
      {import.meta.env.DEV && (
        <DevProfileSwitcher login={login} />
      )}
    </div>
  );
}

/**
 * Dev-only profile switcher. Credentials are for local seed data only.
 * This component is never included in production bundles due to the
 * `import.meta.env.DEV` guard above.
 */
function DevProfileSwitcher({ login }: { login: ReturnType<typeof useAuth>["login"] }) {
  const handleSwitchUser = async (email: string, pass: string) => {
    try {
      await login({ email, password: pass }).unwrap();
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-amber-50 rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-amber-600" />
        <h3 className="font-black text-[#1A1A1A] text-base">
          DEV ONLY — Profile Switcher
        </h3>
      </div>
      <p className="text-xs text-amber-700">
        Switch between seed test profiles. This panel is hidden in production builds.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <button
          type="button"
          onClick={() => handleSwitchUser("admin@dealpool.com", "admin123")}
          className="text-left p-3 rounded-2xl bg-white hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-1.5 font-bold text-xs text-[#1A1A1A]">
            <span>Admin Profile</span>
            <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
              Admin
            </span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">admin@dealpool.com</div>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchUser("riya@community.io", "password123")}
          className="text-left p-3 rounded-2xl bg-white hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer"
        >
          <div className="font-bold text-xs text-[#1A1A1A]">Riya (Need Requester)</div>
          <div className="text-[10px] text-gray-400 mt-0.5">riya@community.io</div>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchUser("arjun@community.io", "password123")}
          className="text-left p-3 rounded-2xl bg-white hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer"
        >
          <div className="font-bold text-xs text-[#1A1A1A]">Arjun (Equipment & Dev)</div>
          <div className="text-[10px] text-gray-400 mt-0.5">arjun@community.io</div>
        </button>
      </div>
    </div>
  );
}
