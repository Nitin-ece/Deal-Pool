import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Deal, Offer } from "../../types";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { fetchOffersForDeal, createOffer, acceptOffer, rejectOffer, withdrawOffer } from "../../redux/slices/offersSlice";
import { useAuth } from "../../hooks/useAuth";
import { StatusBadge } from "../common/StatusBadge";
import { CategoryBadge } from "../common/CategoryBadge";
import { WalletModal } from "../wallet/WalletModal";
import {
  X,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Star,
  ShieldCheck,
  MapPin,
  ArrowRight,
  TrendingUp,
  Coins,
  FileText,
} from "lucide-react";

interface OffersPanelProps {
  deal: Deal | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OffersPanel({ deal, isOpen, onClose }: OffersPanelProps) {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { offersByDeal, loading, actionLoading } = useAppSelector((state) => state.offers);

  const [price, setPrice] = useState<number | string>("");
  const [terms, setTerms] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [neededCoins, setNeededCoins] = useState<number>(500);

  const offers = deal && offersByDeal[deal.id] ? offersByDeal[deal.id] : [];

  useEffect(() => {
    if (deal && isOpen) {
      dispatch(fetchOffersForDeal(deal.id));
      setPrice(deal.budget_min || 500);
      setTerms("");
      setFormError(null);
      setSuccessNotice(null);
      setAcceptError(null);
      setAcceptSuccess(null);
    }
  }, [deal, isOpen, dispatch]);

  if (!isOpen || !deal) return null;

  const isOwner = user?.id === deal.user_id;
  const userOffer = offers.find((o) => o.provider_id === user?.id);

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessNotice(null);

    if (!user) {
      setFormError("Please sign in to submit an offer proposal.");
      return;
    }
    if (!price || Number(price) <= 0) {
      setFormError("Please enter a valid offer price in ₹.");
      return;
    }
    if (!terms.trim() || terms.trim().length < 5) {
      setFormError("Please specify your terms or notes (min 5 characters).");
      return;
    }

    setSubmitting(true);
    try {
      await dispatch(
        createOffer({
          dealId: deal.id,
          price: Number(price),
          terms: terms.trim(),
        })
      ).unwrap();

      setSuccessNotice("Your offer was submitted to the deal requester!");
      setTerms("");
      dispatch(fetchOffersForDeal(deal.id));
    } catch (err: any) {
      setFormError(err || "Failed to submit proposal.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (offerId: string) => {
    setAcceptError(null);
    setAcceptSuccess(null);
    try {
      await dispatch(acceptOffer(offerId)).unwrap();
      setAcceptSuccess("Offer accepted! Escrow has been locked and a contract is active.");
      dispatch(fetchOffersForDeal(deal.id));
    } catch (err: any) {
      const errMsg = typeof err === "string" ? err : err?.message || "Failed to accept offer.";
      setAcceptError(errMsg);
      // If error mentions insufficient balance, extract amount or default to 500
      if (errMsg.toLowerCase().includes("insufficient") || errMsg.toLowerCase().includes("balance")) {
        const match = errMsg.match(/Required:\s*₹?([0-9.]+)/i);
        if (match && match[1]) {
          setNeededCoins(Math.ceil(Number(match[1])));
        }
      }
    }
  };

  const handleReject = async (offerId: string) => {
    await dispatch(rejectOffer(offerId));
    dispatch(fetchOffersForDeal(deal.id));
  };

  const handleWithdraw = async (offerId: string) => {
    await dispatch(withdrawOffer(offerId));
    dispatch(fetchOffersForDeal(deal.id));
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg bg-[var(--surface)] text-[var(--ink)] h-full shadow-2xl flex flex-col justify-between overflow-hidden border-l border-[var(--line)] animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--line)] bg-[var(--surface)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h3 className="font-black text-base text-[var(--ink)]">Live Offers & Terms</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="p-1.5 rounded-full hover:bg-[var(--line)]/40 text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Deal Summary Box with Image */}
          <div className="bg-[var(--surface)]/50 rounded-2xl p-4 border border-[var(--line)] space-y-3">
            <div className="flex gap-3">
              {deal.image_url && (
                <img
                  src={deal.image_url}
                  alt={deal.title}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-xl object-cover border border-[var(--line)] shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CategoryBadge category={deal.category} />
                  <StatusBadge status={deal.status} />
                </div>
                <h4 className="font-bold text-sm text-[var(--ink)] truncate">{deal.title}</h4>
                <p className="text-xs text-[var(--muted)] line-clamp-2 mt-0.5">{deal.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--line)] text-xs">
              <span className="text-[var(--muted)]">
                Target Budget:{" "}
                <strong className="text-[var(--ink)] font-extrabold">
                  ₹{deal.budget_min} - ₹{deal.budget_max}
                </strong>
              </span>
              <span className="text-[var(--muted)]">Within {deal.radius_km || 10} km</span>
            </div>
          </div>

          {/* Accept Error Banner with Direct Top Up Shortcut */}
          {acceptError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-semibold">{acceptError}</span>
              </div>
              {(acceptError.toLowerCase().includes("insufficient") || acceptError.toLowerCase().includes("balance")) && (
                <button
                  type="button"
                  onClick={() => setShowWalletModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Top Up Wallet (₹{neededCoins})</span>
                </button>
              )}
            </div>
          )}

          {/* Accept Success Banner */}
          {acceptSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-500 space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-semibold">{acceptSuccess}</span>
              </div>
              <Link
                to="/contracts"
                className="inline-flex items-center gap-1.5 text-xs font-bold underline hover:text-emerald-400"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Go to Contracts & Escrow &rarr;</span>
              </Link>
            </div>
          )}

          {/* Submit Offer Form (If not owner and deal is open) */}
          {!isOwner && deal.status === "open" && (
            <div className="bg-[var(--surface)] rounded-2xl p-4 border border-[var(--line)] space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted)]">
                  Make Your Offer
                </h4>
                {userOffer && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-bold">
                    You have an offer
                  </span>
                )}
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-xs text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {successNotice && (
                <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successNotice}</span>
                </div>
              )}

              <form onSubmit={handleSubmitOffer} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--ink)] mb-1">
                    Your Proposed Price (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted)]">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full pl-7 pr-3 py-2 bg-[var(--surface)] text-[var(--ink)] rounded-xl text-xs font-bold border border-[var(--line)] focus:outline-none focus:ring-2 focus:ring-[var(--signal)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--ink)] mb-1">
                    Terms & Handover Notes
                  </label>
                  <textarea
                    rows={2}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Describe your offer terms, equipment condition, and pickup availability..."
                    className="w-full p-2.5 bg-[var(--surface)] text-[var(--ink)] rounded-xl text-xs border border-[var(--line)] focus:outline-none focus:ring-2 focus:ring-[var(--signal)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? "Submitting Offer…" : "Send Offer Proposal"}</span>
                </button>
              </form>
            </div>
          )}

          {/* Submitted Offers List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted)]">
                Proposals from Neighbors ({offers.length})
              </h4>
            </div>

            {loading ? (
              <div className="text-center py-8 text-xs text-[var(--muted)]">Loading offers…</div>
            ) : offers.length === 0 ? (
              <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--line)] text-center text-xs text-[var(--muted)]">
                No offers submitted yet.
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map((offer) => {
                  const isMyOffer = user?.id === offer.provider_id;
                  return (
                    <div
                      key={offer.id}
                      className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                        offer.status === "accepted"
                          ? "bg-emerald-500/10 border-emerald-500 shadow-xs"
                          : offer.status === "rejected"
                          ? "bg-[var(--surface)] border-[var(--line)] opacity-60"
                          : "bg-[var(--surface)] border-[var(--line)]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {offer.provider?.profile_photo ? (
                            <img
                              src={offer.provider.profile_photo}
                              alt={offer.provider.username}
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-full object-cover border border-[var(--line)]"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-bold flex items-center justify-center">
                              {offer.provider?.username?.charAt(0).toUpperCase() || "U"}
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-bold text-[var(--ink)]">
                              {offer.provider?.username || "Provider"}
                              {isMyOffer && (
                                <span className="ml-1 text-[9px] bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-amber-500 font-semibold">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                              <span>{offer.provider?.avg_rating?.toFixed(1) || "4.9"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-black text-emerald-500">₹{offer.price}</div>
                          <StatusBadge status={offer.status} />
                        </div>
                      </div>

                      <div className="text-xs text-[var(--ink)] leading-relaxed bg-[var(--surface)]/50 p-2.5 rounded-xl border border-[var(--line)]">
                        {offer.terms}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        {isOwner && deal.status === "open" && offer.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReject(offer.id)}
                              disabled={actionLoading}
                              className="px-3 py-1 rounded-lg text-[11px] font-bold text-[var(--muted)] hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAccept(offer.id)}
                              disabled={actionLoading}
                              className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              Accept Offer
                            </button>
                          </>
                        )}

                        {isMyOffer && offer.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => handleWithdraw(offer.id)}
                            disabled={actionLoading}
                            className="px-3 py-1 rounded-lg text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 transition-colors cursor-pointer"
                          >
                            Withdraw Offer
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--line)] bg-[var(--surface)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-[var(--muted)]">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Escrow protected</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] hover:bg-[var(--line)]/40 cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>

      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        initialDepositAmount={neededCoins}
      />
    </div>
  );
}
