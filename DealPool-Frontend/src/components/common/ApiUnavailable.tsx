import { Link } from "react-router-dom";
import { RadioTower, RefreshCw } from "lucide-react";
import { cn } from "../../lib/cn";

interface ApiUnavailableProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ApiUnavailable({
  title = "Deals API not available yet",
  message = "Auth and admin are connected to DealPool-Backend. Deal and offer routes are not implemented on the server yet — see CONTEXT.md and the frontend README.",
  onRetry,
  className,
}: ApiUnavailableProps) {
  return (
    <div
      className={cn(
        "mx-auto max-w-lg px-4 py-16 text-center",
        className
      )}
    >
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--ink)] text-[var(--signal)]">
        <RadioTower className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{message}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--ink-soft)]"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        )}
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]"
        >
          Account settings
        </Link>
      </div>
    </div>
  );
}
