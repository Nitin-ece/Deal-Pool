import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  KeyRound,
  LogIn,
  ShieldCheck,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { BrandMark } from "../components/common/BrandMark";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1800&auto=format&fit=crop&q=80";

const FLOW = [
  {
    icon: Wallet,
    title: "Escrow first",
    copy: "Coins lock on accept — deposits and lend fees stay honest until return.",
  },
  {
    icon: ShieldCheck,
    title: "Two-sided confirm",
    copy: "Contact stays hidden until both parties confirm. No unilateral reveals.",
  },
  {
    icon: KeyRound,
    title: "OTP verification",
    copy: "Pickup and return require a 6-character code — real presence, not a button mash.",
  },
];

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

      <div
        className="pointer-events-none absolute right-[-10%] top-1/2 hidden h-[70vmin] w-[70vmin] -translate-y-1/2 lg:block"
        aria-hidden
      >
        <div className="absolute inset-0 rounded-full border border-white/10 animate-radar-pulse" />
        <div
          className="absolute inset-[12%] rounded-full border border-[var(--signal)]/25 animate-radar-pulse"
          style={{ animationDelay: "0.6s" }}
        />
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
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--signal)] px-3.5 py-2 text-sm font-bold text-white transition hover:bg-[var(--signal-deep)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            <span>Join</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-5.5rem)] max-w-6xl flex-col justify-center px-5 pb-16 pt-6 sm:px-8 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl space-y-6"
        >
          <motion.p
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08, duration: 0.5 }}
            className="font-display text-5xl font-extrabold leading-none tracking-tight text-white sm:text-6xl md:text-7xl"
          >
            DealPool
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.5 }}
            className="max-w-lg font-display text-2xl font-semibold leading-snug tracking-tight text-white/95 sm:text-3xl"
          >
            Share tools. Escrow-backed. Neighborhood-trusted.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.5 }}
            className="max-w-md text-base leading-relaxed text-white/70 sm:text-lg"
          >
            Borrow gear from nearby makers with coin escrow, OTP handoff verification, and
            two-sided contract confirmation.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.5 }}
            className="flex flex-wrap items-center gap-3 pt-1"
          >
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 rounded-xl bg-[var(--signal)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--signal-deep)] hover:shadow-[0_12px_40px_-12px_rgba(255,107,44,0.85)] active:scale-[0.98]"
            >
              Create account
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/deals"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/45 hover:bg-white/10 active:scale-[0.98]"
            >
              Browse radar
            </Link>
          </motion.div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="mt-auto pt-16 text-xs font-medium tracking-wide text-white/45"
        >
          Hyperlocal resource exchange · Escrow-protected contracts
        </motion.p>
      </main>

      <section className="relative z-10 border-t border-white/10 bg-[var(--ink)]/90 px-5 py-16 backdrop-blur-md sm:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl"
          >
            Built like a real exchange, not a listing board
          </motion.h2>
          <p className="mt-2 max-w-xl text-sm text-white/60">
            Every hop is wallet-aware, custody-aware, and dispute-ready.
          </p>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {FLOW.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{ delay: i * 0.1, duration: 0.45 }}
                  className="group"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-[var(--signal)] transition group-hover:bg-[var(--signal)]/15">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/55">{item.copy}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
