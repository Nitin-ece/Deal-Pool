import React, { useEffect, useState } from "react";
import { Deal, Offer } from "../../types";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { fetchOffersForDeal, createOffer, acceptOffer, rejectOffer, withdrawOffer } from "../../redux/slices/offersSlice";
import { useAuth } from "../../hooks/useAuth";
import { StatusBadge } from "../common/StatusBadge";
import { CategoryBadge } from "../common/CategoryBadge";
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

  const offers = deal && offersByDeal[deal.id] ? offersByDeal[deal.id] : [];

  useEffect(() => {
    if (deal && isOpen) {
      dispatch(fetchOffersForDeal(deal.id));
      setPrice(deal.budget_min || 500);
      setTerms("");
      setFormError(null);
      setSuccessNotice(null);
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
    await dispatch(acceptOffer(offerId));
    dispatch(fetchOffersForDeal(deal.id));
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden border-l border-[#E5E5E2] animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E5E5E2] bg-gray-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#10B981]" />
            <h3 className="font-black text-base text-[#1A1A1A]">Live Offers & Terms</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Deal Summary Box with Image */}
          <div className="bg-[#F9F9F8] rounded-2xl p-4 border border-[#E5E5E2] space-y-3">
            <div className="flex gap-3">
              {deal.image_url && (
                <img
                  src={deal.image_url}
                  alt={deal.title}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-xl object-cover border border-[#E5E5E2] shrink-0"
                />
              )}
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <CategoryBadge category={deal.category} />
                  <StatusBadge status={deal.status} />
                </div>
                <h4 className="font-bold text-sm text-[#1A1A1A] line-clamp-2 leading-snug">
                  {deal.title}
                </h4>
                <div className="text-xs font-black text-[#10B981]">
                  Budget: ₹{deal.budget_min} – ₹{deal.budget_max}
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {deal.description}
            </div>

            <div className="pt-2 border-t border-[#E5E5E2] flex items-center justify-between text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {deal.address || "Connaught Place"} ({deal.radius_km}km radar)
              </span>
              <span className="font-bold text-gray-800">{offers.length} offers submitted</span>
            </div>
          </div>

          {/* Form to submit offer (if not owner and deal is open) */}
          {!isOwner && deal.status === "open" && (
            <div className="bg-white rounded-2xl p-5 border border-[#10B981]/30 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-[#1A1A1A] flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Submit Your Proposal</span>
                </h4>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Direct to Owner</span>
              </div>

              {successNotice && (
                <div className="flex items-center gap-2 text-xs text-[#059669] bg-[#F0FDF4] p-3 rounded-xl border border-emerald-100 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successNotice}</span>
                </div>
              )}

              {formError && (
                <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitOffer} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700">Your Proposed Price (₹)</label>
                    <div className="flex gap-1">
                      {[deal.budget_min, Math.round((deal.budget_min + deal.budget_max) / 2), deal.budget_max].map(
                        (val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setPrice(val)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 hover:bg-[#F0FDF4] hover:text-[#059669] text-gray-600 transition-colors"
                          >
                            ₹{val}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="500"
                      className="w-full pl-8 pr-4 py-2 bg-gray-50 rounded-xl text-sm font-bold text-[#1A1A1A] border border-[#E5E5E2] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#10B981] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Terms, Availability & Handover Notes
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="e.g. Can bring it over Friday at 4 PM, includes HDMI & tripod stand..."
                    className="w-full p-3 bg-gray-50 rounded-xl text-xs text-[#1A1A1A] border border-[#E5E5E2] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#10B981] transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? "Sending Offer..." : "Submit Offer Proposal"}</span>
                </button>
              </form>
            </div>
          )}

          {/* List of Offers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Current Offers ({offers.length})
              </h4>
              {loading && <span className="text-[10px] text-gray-400 animate-pulse">Updating...</span>}
            </div>

            {offers.length === 0 ? (
              <div className="p-6 text-center bg-gray-50 rounded-2xl border border-gray-100 text-gray-500 text-xs">
                No offers submitted yet. Be the first to provide terms!
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
                          ? "bg-[#F0FDF4] border-[#10B981] shadow-xs"
                          : offer.status === "rejected"
                          ? "bg-gray-50 border-gray-200 opacity-60"
                          : "bg-white border-[#E5E5E2]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {offer.provider?.profile_photo ? (
                            <img
                              src={offer.provider.profile_photo}
                              alt={offer.provider.username}
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-full object-cover border border-[#E5E5E2]"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#10B981]/15 text-[#059669] text-xs font-bold flex items-center justify-center">
                              {offer.provider?.username?.charAt(0).toUpperCase() || "U"}
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-bold text-[#1A1A1A]">
                              {offer.provider?.username || "Provider"}
                              {isMyOffer && (
                                <span className="ml-1 text-[9px] bg-emerald-100 text-[#059669] px-1.5 py-0.5 rounded font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                              <span>{offer.provider?.avg_rating?.toFixed(1) || "4.9"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-black text-[#10B981]">₹{offer.price}</div>
                          <StatusBadge status={offer.status} />
                        </div>
                      </div>

                      <div className="text-xs text-gray-700 leading-relaxed bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
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
                              className="px-3 py-1 rounded-lg text-[11px] font-bold text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAccept(offer.id)}
                              disabled={actionLoading}
                              className="px-3.5 py-1 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
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
                            className="px-3 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
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
        <div className="p-4 border-t border-[#E5E5E2] bg-gray-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-gray-500">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span>Encrypted negotiations</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-[#E5E5E2] text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}
