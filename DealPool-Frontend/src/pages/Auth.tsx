import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import { AlertCircle, Compass, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { BrandMark } from "../components/common/BrandMark";
import { getErrorMessage } from "../lib/errors";
import { getGoogleAuthTokens, isFirebaseConfigured } from "../lib/firebase";
import { cn } from "../lib/cn";

interface AuthProps {
  initialMode?: "login" | "register";
}

export function Auth({ initialMode = "login" }: AuthProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, register, googleAuth, isLoading, error, clearError, checkAuth, initialized } =
    useAuth();

  const [mode, setMode] = useState<"login" | "register">(
    location.pathname.includes("register") ? "register" : initialMode
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!initialized) checkAuth();
  }, [checkAuth, initialized]);

  useEffect(() => {
    if (user) navigate("/deals", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    setMode(location.pathname.includes("register") ? "register" : initialMode);
  }, [location.pathname, initialMode]);

  const displayError = localError || (typeof error === "string" && error.trim() ? error : null);

  const authErrorMessage = (err: unknown): string => {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code || "")
        : "";
    if (code === "PROFILE_EXISTS" || code === "EMAIL_EXISTS") {
      return "An account with this email already exists. Switch to Sign in.";
    }
    if (code === "INVALID_CREDENTIALS") {
      return "Invalid email or password. If you haven't registered this account yet, switch to 'Create an account'.";
    }
    if (code === "WEAK_PASSWORD") {
      return "Password must be at least 6 characters.";
    }
    if (code === "INTERNAL_SERVER_ERROR") {
      return "Server error during sign-in. Please try again.";
    }
    if (code === "auth/popup-blocked") {
      return "Popup was blocked by your browser. Please allow popups for this site and try again.";
    }
    if (code === "auth/unauthorized-domain") {
      return "Domain is not authorized in Firebase. Please add this domain to Firebase Console -> Authentication -> Settings -> Authorized Domains.";
    }
    return getErrorMessage(err, "Authentication failed. Check your credentials.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password) {
      setLocalError("Please enter both email and password.");
      return;
    }
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }

    try {
      if (mode === "login") {
        await login({ email: email.trim(), password }).unwrap();
        toast.success("Signed in");
      } else {
        await register({ email: email.trim(), password }).unwrap();
        toast.success("Account created");
      }
      navigate("/deals");
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: string }).code || "")
          : "";
      if (
        mode === "register" &&
        (code === "PROFILE_EXISTS" || code === "EMAIL_EXISTS")
      ) {
        setMode("login");
        navigate("/login", { replace: true });
        toast.message("Account already exists — sign in instead");
      }
      setLocalError(authErrorMessage(err));
    }
  };

  const handleGoogle = async () => {
    setLocalError(null);
    clearError();
    if (!isFirebaseConfigured) {
      setLocalError(
        "Google sign-in is not configured. Add VITE_FIREBASE_API_KEY, AUTH_DOMAIN, and PROJECT_ID to DealPool-Frontend/.env, then restart Vite."
      );
      return;
    }
    setGoogleLoading(true);
    try {
      const tokens = await getGoogleAuthTokens();
      await googleAuth(tokens).unwrap();
      toast.success("Signed in with Google");
      navigate("/deals");
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: string }).code || "")
          : "";
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        return;
      }
      setLocalError(authErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--paper)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[42vh] bg-[var(--ink)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full border border-white/10 animate-radar-pulse"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <BrandMark inverted className="justify-center" />
          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-white">
            {mode === "login" ? "Welcome back" : "Join DealPool"}
          </h1>
          <p className="mt-2 text-sm text-white/65">
            {mode === "login"
              ? "Sign in with the same account your backend Firebase project uses."
              : "Username is generated on the server — you can change it later in Settings."}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-[var(--line)] bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="mb-5 flex rounded-xl bg-[var(--paper)] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setLocalError(null);
                clearError();
                navigate("/login", { replace: true });
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition",
                mode === "login"
                  ? "bg-white text-[var(--ink)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              )}
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setLocalError(null);
                clearError();
                navigate("/register", { replace: true });
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition",
                mode === "register"
                  ? "bg-white text-[var(--ink)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              )}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Register
            </button>
          </div>

          {displayError && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-xs leading-relaxed text-rose-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="mb-1.5 block text-xs font-bold text-[var(--ink)]">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--ink)] focus:bg-white focus:ring-2 focus:ring-[var(--signal)]/30"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="auth-password" className="block text-xs font-bold text-[var(--ink)]">
                  Password
                </label>
                <span className="shrink-0 text-[10px] font-medium text-[var(--muted)]">Min 6 characters</span>
              </div>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--ink)] focus:bg-white focus:ring-2 focus:ring-[var(--signal)]/30"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || googleLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--signal)] py-3 text-sm font-bold text-white transition hover:bg-[var(--signal-deep)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                "Connecting…"
              ) : mode === "login" ? (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign in
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create account
                </>
              )}
            </button>
          </form>

          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-x-0 border-t border-[var(--line)]" />
            <span className="relative bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
              or
            </span>
          </div>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading || googleLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white py-2.5 text-xs font-bold text-[var(--ink)] transition hover:bg-[var(--surface)] disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
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
            {googleLoading ? "Opening Google…" : "Continue with Google"}
          </button>
          {!isFirebaseConfigured && (
            <p className="mt-2 text-center text-[10px] leading-relaxed text-[var(--muted)]">
              Google needs Firebase Web keys in <code className="font-mono">.env</code> (already set for
              project <span className="font-semibold">dealpoolbackend</span>). Restart{" "}
              <code className="font-mono">pnpm dev</code> after editing env.
            </p>
          )}
        </motion.div>

        <div className="mt-6 text-center">
          <Link
            to="/deals"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--pool)]"
          >
            <Compass className="h-3.5 w-3.5" />
            Continue as guest to radar
          </Link>
        </div>
      </div>
    </div>
  );
}
