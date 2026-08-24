import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Handshake,
  KeyRound,
  Package,
  RefreshCw,
  RotateCcw,
  Shield,
  Star,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useAppDispatch } from "../redux/store";
import { fetchWallet } from "../redux/slices/walletSlice";
import { cn } from "../lib/cn";
import type { Contract, HandoffOTP } from "../types/contracts";
import { StatusBadge } from "../components/common/StatusBadge";
import { OTPDisplay } from "../components/contracts/OTPDisplay";
import { RatingModal } from "../components/contracts/RatingModal";

const STEPS = [
  { key: "confirm", label: "Confirm", icon: Handshake },
  { key: "checkout", label: "Pickup", icon: Package },
  { key: "active", label: "In use", icon: ArrowRightLeft },
  { key: "return", label: "Return", icon: RotateCcw },
  { key: "done", label: "Complete", icon: CheckCircle2 },
];

function stepIndex(status: Contract["status"]): number {
  switch (status) {
    case "created":
    case "pending_confirmation":
      return 0;
    case "confirmed":
      return 1;
    case "active":
      return 2;
    case "returned":
    case "returned_pending_dispute":
    case "disputed":
      return 3;
    case "completed":
      return 4;
    default:
      return -1;
  }
}

function roleLabel(isRequester: boolean): string {
  return isRequester ? "Owner (requester)" : "Borrower (provider)";
}

function DisputeModal({
  contractId,
  isOpen,
  onClose,
  onSuccess,
}: {
  contractId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState<string>("damage");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Please describe the issue");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/api/contracts/${contractId}/dispute-condition`, {
        reason,
        description: description.trim(),
      });
      toast.success("Dispute filed — escrow is held until resolved");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || "Failed to file dispute");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div
        className="w-full max-w-md bg-[var(--surface)] border border-[var(--line)] rounded-3xl shadow-2xl overflow-hidden text-[var(--ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-[var(--line)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h3 className="font-black text-base text-[var(--ink)]">File a Dispute</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-full hover:bg-[var(--line)]/40 text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
            <Shield className="w-4 h-4 shrink-0" />
            <span>Filing a dispute will hold the escrow money until an admin resolves it.</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 bg-[var(--paper)] text-[var(--ink)] rounded-xl text-xs border border-[var(--line)] focus:outline-none focus:ring-2 focus:ring-rose-500/30 cursor-pointer"
            >
              <option value="damage">Damage to item</option>
              <option value="damage_claim">Damage claim</option>
              <option value="overcharge">Overcharge</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              required
              className="w-full p-3 bg-[var(--paper)] text-[var(--ink)] rounded-2xl text-xs border border-[var(--line)] focus:outline-none focus:ring-2 focus:ring-rose-500/30 transition-all placeholder:text-[var(--muted)] leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !description.trim()}
              className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{submitting ? "Filing..." : "File Dispute"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ContractCard({
  contract,
  userId,
  onRefresh,
}: {
  contract: Contract;
  userId: string;
  onRefresh: () => void;
}) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState<string | null>(null);
  const [otpData, setOtpData] = useState<HandoffOTP | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  const isRequester = contract.requester_id === userId;
  const isProvider = contract.provider_id === userId;
  const currentStep = stepIndex(contract.status);
  const alreadyConfirmed =
    (isRequester && contract.requester_confirmed) ||
    (isProvider && contract.provider_confirmed);

  const runAction = async (action: string, fn: () => Promise<void>) => {
    setLoading(action);
    try {
      await fn();
      toast.success("Contract updated");
      onRefresh();
      dispatch(fetchWallet());
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || "Action failed");
    } finally {
      setLoading(null);
    }
  };

  const confirm = () =>
    runAction("confirm", () => api.post(`/api/contracts/${contract.id}/confirm`));

  const cancel = () =>
    runAction("cancel", () =>
      api.post(`/api/contracts/${contract.id}/cancel`, { reason: "User cancelled" })
    );

  const generateOTP = async (purpose: "checkout" | "return") => {
    setLoading(`otp-${purpose}`);
    try {
      const data = await api.post<any, HandoffOTP>(
        `/api/contracts/${contract.id}/generate-otp?purpose=${purpose}`
      );
      setOtpData({
        ...data,
        expiresAt:
          typeof data.expiresAt === "string"
            ? data.expiresAt
            : new Date(data.expiresAt as unknown as Date).toISOString(),
      });
      toast.success("OTP code generated — share it with the other party");
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || "Could not generate code");
    } finally {
      setLoading(null);
    }
  };

  const checkout = async () => {
    const code = otpInput.trim();
    if (!code) {
      toast.error("Enter the pickup code from the provider");
      return;
    }
    await runAction("checkout", () =>
      api.post(`/api/contracts/${contract.id}/checkout`, { code })
    );
    setOtpData(null);
    setOtpInput("");
  };

  const returnItem = async () => {
    const code = otpInput.trim();
    if (!code) {
      toast.error("Enter the return code from the requester");
      return;
    }
    await runAction("return", () =>
      api.post(`/api/contracts/${contract.id}/return`, { code })
    );
    setOtpData(null);
    setOtpInput("");
  };

  const rate = async (score: number) => {
    await runAction("rate", () =>
      api.post(`/api/contracts/${contract.id}/rate`, {
        score,
        review: "Great exchange!",
      })
    );
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-xs"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            Contract · {roleLabel(isRequester)}
          </p>
          <h3 className="font-display text-lg font-bold text-[var(--ink)]">
            ₹{Number(contract.lend_fee || contract.rental_fee || 0)} lend · ₹
            {Number(contract.security_amount || contract.security_deposit || 0)} deposit
          </h3>
        </div>
        <StatusBadge status={contract.status} />
      </div>

      {currentStep >= 0 && contract.status !== "cancelled" && (
        <div className="flex items-center gap-1 overflow-x-auto px-5 py-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={step.key} className="flex min-w-0 flex-1 items-center gap-1">
                <div
                  className={cn(
                    "flex flex-col items-center gap-1",
                    done && "text-[var(--pool)]",
                    active && "text-[var(--signal)]",
                    !done && !active && "text-[var(--muted)]"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 transition",
                      done && "border-[var(--pool)] bg-[var(--pool)]/10",
                      active && "border-[var(--signal)] bg-[var(--signal)]/10 scale-110",
                      !done && !active && "border-[var(--line)]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[9px] font-bold">{step.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mb-4 h-0.5 flex-1 rounded-full",
                      i < currentStep ? "bg-[var(--pool)]" : "bg-[var(--line)]"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-3 px-5 pb-5">
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-xl bg-[var(--paper)] p-3">
            <span className="text-[var(--muted)]">Declared value</span>
            <p className="font-bold text-[var(--ink)]">₹{Number(contract.declared_value)}</p>
          </div>
          <div className="rounded-xl bg-[var(--paper)] p-3">
            <span className="text-[var(--muted)]">Contact</span>
            <p className="font-bold text-[var(--ink)]">
              {contract.contact_revealed ? "Revealed" : "Hidden until both confirm"}
            </p>
          </div>
          <div className="col-span-2 rounded-xl bg-[var(--paper)] p-3 sm:col-span-1">
            <span className="text-[var(--muted)]">Your confirm</span>
            <p className="font-bold text-[var(--ink)]">
              {alreadyConfirmed ? "Done" : "Waiting"}
              {" · "}
              {isRequester
                ? contract.provider_confirmed
                  ? "Borrower ready"
                  : "Borrower pending"
                : contract.requester_confirmed
                  ? "Owner ready"
                  : "Owner pending"}
            </p>
          </div>
        </div>

        {/* ── CONFIRM PHASE ── */}
        {(contract.status === "created" || contract.status === "pending_confirmation") && (
          <div className="flex flex-wrap gap-2">
            {!alreadyConfirmed && (
              <button
                type="button"
                disabled={!!loading}
                onClick={confirm}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--pool)] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Handshake className="h-3.5 w-3.5" />
                {loading === "confirm" ? "Confirming…" : "Confirm participation"}
              </button>
            )}
            {alreadyConfirmed && (
              <p className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">
                <Clock className="h-3.5 w-3.5" />
                Waiting for the other party
              </p>
            )}
            <button
              type="button"
              disabled={!!loading}
              onClick={cancel}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-500 transition hover:bg-rose-500/20 disabled:opacity-50 cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel (10% fee)
            </button>
          </div>
        )}

        {/* ── CHECKOUT PHASE (status = confirmed) ── */}
        {contract.status === "confirmed" && (
          <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="text-xs font-semibold text-[var(--ink)]">
              {isProvider
                ? "Generate a pickup code and share it with the requester to confirm handoff"
                : "Enter the pickup code from the provider to confirm you received the item"}
            </p>

            {isProvider && (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={!!loading}
                  onClick={() => generateOTP("checkout")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--signal)] px-4 py-2 text-xs font-bold text-white cursor-pointer shadow-xs hover:opacity-90 disabled:opacity-50"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  {loading === "otp-checkout" ? "Generating…" : "Generate Pickup Code"}
                </button>
                {otpData?.purpose === "checkout" && (
                  <OTPDisplay otp={otpData} label="Pickup Code — share with requester" />
                )}
              </div>
            )}

            {isRequester && (
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Enter pickup code from provider
                  <input
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.toUpperCase())}
                    placeholder="e.g. A3B-K2M"
                    maxLength={7}
                    className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--signal)]/30 uppercase"
                  />
                </label>
                <button
                  type="button"
                  disabled={!!loading || !otpInput.trim()}
                  onClick={checkout}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--pool)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer shadow-xs hover:opacity-90"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {loading === "checkout" ? "Confirming…" : "Confirm Pickup"}
                </button>
              </div>
            )}

            <button
              type="button"
              disabled={!!loading}
              onClick={cancel}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500 cursor-pointer"
            >
              Cancel before pickup
            </button>
          </div>
        )}

        {/* ── ACTIVE / RETURN PHASE ── */}
        {contract.status === "active" && (
          <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="text-xs font-semibold text-[var(--ink)]">
              {isRequester
                ? "Generate a return code and share it with the provider to confirm return"
                : "Enter the return code from the requester to confirm item handback"}
            </p>

            {isRequester && (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={!!loading}
                  onClick={() => generateOTP("return")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--pool)] px-4 py-2 text-xs font-bold text-white cursor-pointer shadow-xs hover:opacity-90 disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {loading === "otp-return" ? "Generating…" : "Generate Return Code"}
                </button>
                {otpData?.purpose === "return" && (
                  <OTPDisplay otp={otpData} label="Return Code — share with provider" />
                )}
              </div>
            )}

            {isProvider && (
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  Enter return code from requester
                  <input
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.toUpperCase())}
                    placeholder="e.g. X7N-P4D"
                    maxLength={7}
                    className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--pool)]/30 uppercase"
                  />
                </label>
                <button
                  type="button"
                  disabled={!!loading || !otpInput.trim()}
                  onClick={returnItem}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--pool)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer shadow-xs hover:opacity-90"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {loading === "return" ? "Confirming…" : "Confirm Return"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── RETURNED / DISPUTE WINDOW ── */}
        {(contract.status === "returned" ||
          contract.status === "returned_pending_dispute") && (
          <div className="space-y-2">
            {contract.dispute_deadline && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/15 px-3 py-2 text-xs text-amber-500 border border-amber-500/30">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                Dispute window until {new Date(contract.dispute_deadline).toLocaleString()}
              </div>
            )}
            {!contract.condition_disputed && (
              <button
                type="button"
                disabled={!!loading}
                onClick={() => setShowDisputeModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-500 cursor-pointer hover:bg-rose-500/20 transition"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                File a Dispute
              </button>
            )}
            {contract.condition_disputed && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 px-3 py-2 text-xs text-rose-500 border border-rose-500/30">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Dispute has been filed — escrow held until admin resolution
              </div>
            )}
          </div>
        )}

        {/* ── DISPUTED ── */}
        {contract.status === "disputed" && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 px-3 py-3 text-xs text-rose-500 border border-rose-500/30">
            <Shield className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">Dispute active — escrow is held</p>
              <p className="text-rose-400 mt-0.5">
                An admin will review and resolve this dispute. Escrow funds are secured until resolution.
              </p>
            </div>
          </div>
        )}

        {/* ── COMPLETED ── */}
        {contract.status === "completed" && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/25">
            <div className="flex items-center gap-2 text-xs text-amber-500 font-bold">
              <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
              <span>Exchange completed & finalized!</span>
            </div>
            <button
              type="button"
              onClick={() => setShowRatingModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>Rate & Review Exchange</span>
            </button>
            <RatingModal
              contractId={contract.id}
              isOpen={showRatingModal}
              onClose={() => setShowRatingModal(false)}
              onSuccess={() => {
                onRefresh();
                dispatch(fetchWallet());
              }}
              counterpartName={isRequester ? "Lender" : "Requester"}
            />
          </div>
        )}
      </div>

      {/* Dispute Modal */}
      <DisputeModal
        contractId={contract.id}
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        onSuccess={() => {
          onRefresh();
          dispatch(fetchWallet());
        }}
      />
    </motion.article>
  );
}

export function Contracts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.get<any, Contract[]>("/api/contracts");
      setContracts(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || "Could not load contracts");
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--pool)] shadow-xs">
            <Shield className="h-3 w-3" />
            Escrow protected
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
            My Contracts
          </h1>
          <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
            Two-sided confirm, OTP verification for pickup/return, and escrow release — matched to the DealPool API.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--ink)] transition hover:bg-[var(--line)]/40 cursor-pointer shadow-xs"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-3xl bg-[var(--line)]/40" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-12 text-center shadow-xs">
          <Package className="mx-auto h-10 w-10 text-[var(--muted)]" />
          <p className="mt-3 font-bold text-[var(--ink)]">No active contracts</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Accept an offer on a deal to start an escrow-backed contract.
          </p>
          <Link
            to="/deals"
            className="mt-4 inline-flex rounded-xl bg-[var(--signal)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--signal-deep)] transition-all"
          >
            Browse radar
          </Link>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {contracts.map((c) => (
              <ContractCard
                key={c.id}
                contract={c}
                userId={user!.id}
                onRefresh={load}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
