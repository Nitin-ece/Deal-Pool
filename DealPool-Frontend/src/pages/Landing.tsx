import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { BrandMark } from "../components/common/BrandMark";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1800&auto=format&fit=crop&q=80";

export function Landing() {
  const navigate = useNavigate();
  const { user, checkAuth, initialized } = useAuth();

  useEffect(() => {
    if (!initialized) checkAuth();
  }, [checkAuth, initialized]);

  useEffect(() => {
    if (user) navigate("/deals", { replace: true });
  }, [user, navigate]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[var(--ink)] text-white">
      {/* Full-bleed hero visual */}
      <div className="absolute inset-0 hero-grain">
        <img
          src={HERO_IMAGE}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--ink)] via-[var(--ink)]/88 to-[var(--ink)]/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-transparent to-[var(--ink)]/40" />
      </div>

      {/* Radar motion accents */}
      <div className="pointer-events-none absolute right-[-10%] top-1/2 hidden h-[70vmin] w-[70vmin] -translate-y-1/2 lg:block" aria-hidden>
        <div className="absolute inset-0 rounded-full border border-white/10 animate-radar-pulse" />
        <div className="absolute inset-[12%] rounded-full border border-[var(--signal)]/25 animate-radar-pulse" style={{ animationDelay: "0.6s" }} />
        <div className="absolute inset-[28%] rounded-full border border-white/15" />
        <div className="absolute inset-0 animate-radar-sweep opacity-40">
          <div className="absolute left-1/2 top-1/2 h-1/2 w-px origin-top bg-gradient-to-b from-[var(--signal)] to-transparent" />
        </div>
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-7">
        <BrandMark inverted />
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Sign in</span>
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--signal)] px-3.5 py-2 text-sm font-bold text-white transition hover:bg-[var(--signal-deep)]"
          >
            <UserPlus className="h-4 w-4" />
            <span>Join</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-5.5rem)] max-w-6xl flex-col justify-center px-5 pb-16 pt-6 sm:px-8 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl space-y-6"
        >
          <p className="font-display text-5xl font-extrabold leading-none tracking-tight text-white sm:text-6xl md:text-7xl">
            DealPool
          </p>
          <h1 className="max-w-lg font-display text-2xl font-semibold leading-snug tracking-tight text-white/95 sm:text-3xl">
            Post what you need. Get local offers in minutes.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
            Borrow gear, hire a neighbor, or trade skills inside your radius — exact address stays shielded until you accept.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--signal)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--signal-deep)]"
            >
              Create account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/deals"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/45 hover:bg-white/10"
            >
              Browse radar
            </Link>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="mt-auto pt-16 text-xs font-medium tracking-wide text-white/45"
        >
          Hyperlocal resource & skill exchange · Cookie-secured sessions
        </motion.p>
      </main>
    </div>
  );
}
