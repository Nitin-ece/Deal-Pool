import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check } from "lucide-react";
import type { HandoffToken } from "../../types/contracts";

export function HandoffQr({
  handoff,
  label,
}: {
  handoff: HandoffToken;
  label: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(handoff.token, {
      width: 220,
      margin: 1,
      color: { dark: "#14181F", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [handoff.token]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(handoff.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const expires = new Date(handoff.expiresAt);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-xs">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{label}</p>
      {dataUrl ? (
        <div className="p-2 bg-white rounded-2xl shadow-xs">
          <img src={dataUrl} alt="Handoff QR code" className="h-44 w-44 rounded-xl" />
        </div>
      ) : (
        <div className="h-44 w-44 animate-pulse rounded-xl bg-[var(--paper)]" />
      )}
      <p className="text-center text-[10px] text-[var(--muted)]">
        Expires {expires.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-1.5 text-[10px] font-bold text-[var(--ink)] transition hover:bg-[var(--paper)] cursor-pointer"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy token"}
      </button>
    </div>
  );
}
