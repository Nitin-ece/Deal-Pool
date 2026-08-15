import { DealStatus, OfferStatus } from "../../types";

export function StatusBadge({ status }: { status: DealStatus | OfferStatus | string }) {
  const base = "inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide";
  switch (status) {
    case "open":
      return <span className={`${base} border border-[var(--line)] bg-white text-[var(--pool)]`}>Open</span>;
    case "offer_accepted":
      return <span className={`${base} bg-[var(--signal)] text-white`}>Matched</span>;
    case "completed":
      return <span className={`${base} bg-[var(--paper)] text-[var(--ink)]`}>Completed</span>;
    case "cancelled":
      return <span className={`${base} border border-rose-100 bg-rose-50 text-rose-600`}>Cancelled</span>;
    case "pending":
      return <span className={`${base} border border-amber-200 bg-amber-50 text-amber-800`}>Pending</span>;
    case "accepted":
      return <span className={`${base} border border-[var(--line)] bg-[var(--surface)] text-[var(--pool)]`}>Accepted</span>;
    case "rejected":
      return <span className={`${base} bg-[var(--paper)] text-[var(--muted)]`}>Declined</span>;
    case "withdrawn":
      return <span className={`${base} bg-[var(--paper)] text-[var(--muted)]`}>Withdrawn</span>;
    default:
      return <span className={`${base} border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]`}>{status}</span>;
  }
}
