import { DealStatus, OfferStatus } from "../../types";
import type { ContractStatus } from "../../types/contracts";
import { cn } from "../../lib/cn";

const base =
  "inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide";

export function StatusBadge({
  status,
}: {
  status: DealStatus | OfferStatus | ContractStatus | string;
}) {
  switch (status) {
    case "open":
      return (
        <span className={cn(base, "border border-[var(--line)] bg-white text-[var(--pool)]")}>
          Open
        </span>
      );
    case "offer_accepted":
      return <span className={cn(base, "bg-[var(--signal)] text-white")}>Matched</span>;
    case "completed":
      return (
        <span className={cn(base, "bg-[var(--paper)] text-[var(--ink)]")}>Completed</span>
      );
    case "cancelled":
      return (
        <span className={cn(base, "border border-rose-100 bg-rose-50 text-rose-600")}>
          Cancelled
        </span>
      );
    case "pending":
      return (
        <span className={cn(base, "border border-amber-200 bg-amber-50 text-amber-800")}>
          Pending
        </span>
      );
    case "accepted":
      return (
        <span className={cn(base, "border border-[var(--line)] bg-[var(--surface)] text-[var(--pool)]")}>
          Accepted
        </span>
      );
    case "rejected":
      return (
        <span className={cn(base, "bg-[var(--paper)] text-[var(--muted)]")}>Declined</span>
      );
    case "withdrawn":
      return (
        <span className={cn(base, "bg-[var(--paper)] text-[var(--muted)]")}>Withdrawn</span>
      );
    case "created":
      return (
        <span className={cn(base, "border border-[var(--line)] bg-white text-[var(--ink)]")}>
          Created
        </span>
      );
    case "pending_confirmation":
      return (
        <span className={cn(base, "border border-amber-200 bg-amber-50 text-amber-800")}>
          Awaiting confirm
        </span>
      );
    case "confirmed":
      return (
        <span className={cn(base, "border border-[var(--pool)]/30 bg-[var(--pool)]/10 text-[var(--pool)]")}>
          Confirmed
        </span>
      );
    case "active":
      return <span className={cn(base, "bg-[var(--signal)] text-white")}>In use</span>;
    case "returned":
    case "returned_pending_dispute":
      return (
        <span className={cn(base, "border border-sky-200 bg-sky-50 text-sky-800")}>
          Returned
        </span>
      );
    case "disputed":
      return (
        <span className={cn(base, "border border-rose-200 bg-rose-50 text-rose-700")}>
          Disputed
        </span>
      );
    default:
      return (
        <span className={cn(base, "border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]")}>
          {status}
        </span>
      );
  }
}
