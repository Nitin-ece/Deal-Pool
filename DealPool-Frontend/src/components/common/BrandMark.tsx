import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";

interface BrandMarkProps {
  to?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  inverted?: boolean;
  className?: string;
}

const sizes = {
  sm: { box: "h-8 w-8", icon: 16, text: "text-lg" },
  md: { box: "h-10 w-10", icon: 20, text: "text-2xl" },
  lg: { box: "h-12 w-12", icon: 24, text: "text-3xl" },
};

export function BrandMark({
  to = "/",
  size = "md",
  showWordmark = true,
  inverted = false,
  className,
}: BrandMarkProps) {
  const s = sizes[size];
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-xl shadow-sm",
          s.box,
          inverted ? "bg-white/10 text-[var(--signal)]" : "bg-[var(--ink)] text-[var(--signal)]"
        )}
        aria-hidden
      >
        <svg width={s.icon} height={s.icon} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
          <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.25" opacity="0.28" />
        </svg>
      </span>
      {showWordmark && (
        <span
          className={cn(
            "font-display font-bold tracking-tight",
            s.text,
            inverted ? "text-white" : "text-[var(--ink)]"
          )}
        >
          MakerPool
        </span>
      )}
    </span>
  );

  if (!to) return content;
  return (
    <Link
      to={to}
      className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)] focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  );
}
