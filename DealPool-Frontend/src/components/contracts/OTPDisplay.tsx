import { useEffect, useState } from "react";
import { Copy, Check, Timer } from "lucide-react";
import type { HandoffOTP } from "../../types/contracts";

export function OTPDisplay({
  otp,
  label,
}: {
  otp: HandoffOTP;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const expires = new Date(otp.expiresAt).getTime();

    const tick = () => {
      const diff = expires - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [otp.expiresAt]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(otp.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const isExpired = timeLeft === "Expired";
  const [left, right] = otp.code.split("-");

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>

      {/* Large OTP display */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {(left || "").split("").map((char, i) => (
            <span
              key={`l-${i}`}
              className="flex h-12 w-10 items-center justify-center rounded-xl border-2 border-[var(--line)] bg-[var(--paper)] font-mono text-2xl font-black text-[var(--ink)] shadow-xs"
            >
              {char}
            </span>
          ))}
        </div>
        <span className="text-2xl font-black text-[var(--muted)]">—</span>
        <div className="flex gap-1">
          {(right || "").split("").map((char, i) => (
            <span
              key={`r-${i}`}
              className="flex h-12 w-10 items-center justify-center rounded-xl border-2 border-[var(--line)] bg-[var(--paper)] font-mono text-2xl font-black text-[var(--ink)] shadow-xs"
            >
              {char}
            </span>
          ))}
        </div>
      </div>

      {/* Timer + Copy */}
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold ${
            isExpired
              ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
              : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
          }`}
        >
          <Timer className="h-3 w-3" />
          {isExpired ? "Expired — generate a new code" : `Expires in ${timeLeft}`}
        </div>
        <button
          type="button"
          onClick={copy}
          disabled={isExpired}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-1.5 text-[10px] font-bold text-[var(--ink)] transition hover:bg-[var(--paper)] cursor-pointer disabled:opacity-50"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>

      <p className="text-[10px] text-center text-[var(--muted)] max-w-xs leading-relaxed">
        Share this code with the other party. They will enter it to confirm the{" "}
        {otp.purpose === "checkout" ? "pickup" : "return"}.
      </p>
    </div>
  );
}
