import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../redux/store";
import { fetchDealById, deleteDeal, updateDeal } from "../redux/slices/dealsSlice";
import { fetchOffersForDeal, acceptOffer, rejectOffer, withdrawOffer } from "../redux/slices/offersSlice";
import { useAuth } from "../hooks/useAuth";
import { MakeOfferForm } from "../components/offers/MakeOfferForm";
import { OfferCard } from "../components/offers/OfferCard";
import { CategoryBadge } from "../components/common/CategoryBadge";
import { StatusBadge } from "../components/common/StatusBadge";
import { WalletModal } from "../components/wallet/WalletModal";
import {
  ArrowLeft,
  MapPin,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Clock,
  User,
  Star,
  Trash2,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Radio,
  Share2,
  Send,
  Eye,
  Check,
  Coins,
  FileText,
} from "lucide-react";

import { DEFAULT_CATEGORY_IMAGES } from "../lib/categoryImages";

export function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const { currentDeal, loading: dealLoading, error: dealError } = useAppSelector((state) => state.deals);
  const offersState = useAppSelector((state) => state.offers);
  const offers = id && offersState.offersByDeal[id] ? offersState.offersByDeal[id] : [];

  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [neededCoins, setNeededCoins] = useState<number>(500);

  useEffect(() => {
    if (id) {
      dispatch(fetchDealById(id));
      dispatch(fetchOffersForDeal(id));
    }
  }, [dispatch, id]);

  if (dealLoading && !currentDeal) {
    return (
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-16 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-500 font-semibold">Loading need details & radar offers...</p>
      </div>
    );
  }

  if (dealError || !currentDeal) {
    return (
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[#1A1A1A]">Need not found or removed</h2>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          {dealError || "The requested need proposal could not be retrieved."}
        </p>
        <Link
          to="/deals"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#10B981] text-white text-xs font-bold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Radar</span>
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === currentDeal.user_id;
  const userOffer = offers.find((o) => o.provider_id === user?.id);
  const hasAcceptedOffer = offers.some((o) => o.status === "accepted");
  const isParticipant = isOwner || (userOffer && userOffer.status === "accepted") || (user && user.role === "admin");

  const imageUrl = currentDeal.image_url || DEFAULT_CATEGORY_IMAGES[currentDeal.category] || DEFAULT_CATEGORY_IMAGES["Other"];

  const handleAccept = async (offerId: string) => {
    setAcceptError(null);
    setAcceptSuccess(null);
    try {
      await dispatch(acceptOffer(offerId)).unwrap();
      setAcceptSuccess("Offer accepted! Escrow has been locked and a contract is now active.");
      if (id) {
        dispatch(fetchDealById(id));
        dispatch(fetchOffersForDeal(id));
      }
    } catch (err: any) {
      const errMsg = typeof err === "string" ? err : err?.message || "Failed to accept offer.";
      setAcceptError(errMsg);
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
  };

  const handleWithdraw = async (offerId: string) => {
    await dispatch(withdrawOffer(offerId));
  };

  const handleDeleteDeal = async () => {
    if (!id) return;
    await dispatch(deleteDeal(id));
    navigate("/deals");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleMarkCompleted = async () => {
    if (!id) return;
    await dispatch(updateDeal({ id, payload: { status: "completed" } }));
    dispatch(fetchDealById(id));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Back Button & Top Action Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/deals")}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#059669] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Neighborhood Radar</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="px-3.5 py-1.5 rounded-xl border border-[#E5E5E2] bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? "Link Copied!" : "Share Need"}</span>
          </button>

          {isOwner && (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
              title="Delete Need"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in">
          <div className="text-xs text-rose-800 font-semibold">
            Are you sure you want to remove this need? All associated offers will be cancelled.
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setDeleteConfirm(false)}
              className="px-3 py-1 bg-white text-gray-700 rounded-lg text-xs font-bold border border-gray-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteDeal}
              className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Hero Visual Item Card */}
      <div className="bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--line)] shadow-xs">
        {/* Full-width Product/Item Photography Banner */}
        <div className="relative h-64 sm:h-80 lg:h-96 w-full overflow-hidden bg-[var(--paper)]">
          <img
            src={imageUrl}
            alt={currentDeal.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

          {/* Top Overlays: Badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <CategoryBadge category={currentDeal.category} />
              <span className="bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/20">
                {currentDeal.radius_km || 6} km Radar
              </span>
            </div>
            <StatusBadge status={currentDeal.status} />
          </div>

          {/* Bottom Overlays: Title & Budget Range */}
          <div className="absolute bottom-5 left-5 right-5 text-white z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <MapPin className="w-3.5 h-3.5" />
                <span>{currentDeal.address || "Local Neighborhood Area"}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white drop-shadow-md leading-tight">
                {currentDeal.title}
              </h1>
            </div>

            <div className="bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 shrink-0">
              <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider block">
                Offered Budget
              </span>
              <span className="text-xl sm:text-2xl font-black text-[#10B981]">
                ₹{currentDeal.budget_min}
                {currentDeal.budget_max > currentDeal.budget_min ? ` – ₹${currentDeal.budget_max}` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2">
              Need Description & Specifications
            </h3>
            <p className="text-sm sm:text-base text-[var(--ink)] leading-relaxed whitespace-pre-line font-medium">
              {currentDeal.description}
            </p>
          </div>

          {/* Location Privacy Shield Indicator */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
              isParticipant
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                : "bg-amber-500/10 border-amber-500/30 text-amber-500"
            }`}
          >
            {isParticipant ? (
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-bold text-sm">
                {isParticipant ? "Verified Exchange Coordinates Unlocked" : "Location Privacy Shield Active"}
              </div>
              <div className="leading-relaxed opacity-90">
                {isParticipant
                  ? `Exact Meeting Point: ${currentDeal.address || "Local Neighborhood Exchange Point"} (Coordinates: ${Number(currentDeal.lat || 0).toFixed(4)}, ${Number(currentDeal.lng || 0).toFixed(4)})`
                  : "Exact coordinates and address are protected. Complete contact & meeting address are released once an offer is accepted by the need requester."}
              </div>
            </div>
          </div>

          {/* Owner Controls: Mark Completed */}
          {isOwner && currentDeal.status === "offer_accepted" && (
            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-emerald-500 font-semibold">
                You accepted an offer for this need. When the equipment exchange or task is finished, mark it complete.
              </div>
              <button
                id="mark-deal-complete-btn"
                onClick={handleMarkCompleted}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                Mark as Completed
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Creator Profile (Left) & Offers / Make Offer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Creator Information & Trust Rating */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[var(--surface)] rounded-3xl p-6 border border-[var(--line)] shadow-xs space-y-4">
            <div className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
              Need Requester
            </div>

            <div className="flex items-center gap-3.5">
              {currentDeal.creator?.profile_photo ? (
                <img
                  src={currentDeal.creator.profile_photo}
                  alt={currentDeal.creator.username}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border border-[var(--line)]"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[var(--signal)]/10 text-[var(--signal)] font-black text-sm flex items-center justify-center border border-[var(--line)]">
                  <User className="w-6 h-6" />
                </div>
              )}

              <div>
                <div className="font-bold text-[var(--ink)] text-sm">
                  {currentDeal.creator?.username || "Community Member"}
                </div>
                <div className="text-[11px] text-[var(--signal)] font-bold">
                  Verified Neighbor
                </div>
              </div>
            </div>

            {/* Reputation Rating */}
            <div className="p-3 bg-[var(--paper)] rounded-2xl border border-[var(--line)] flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--muted)]">Reputation</span>
              <div className="flex items-center gap-1 text-xs text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span>{currentDeal.creator?.avg_rating != null ? Number(currentDeal.creator.avg_rating).toFixed(1) : "New"}</span>
                <span className="text-[var(--muted)] font-normal">
                  ({currentDeal.creator?.rating_count ?? 0} reviews)
                </span>
              </div>
            </div>

            <div className="text-xs text-[var(--muted)] leading-relaxed">
              DealPool's reputation and rating system guarantees safe and dependable neighbor interactions.
            </div>
          </div>
        </div>

        {/* Right Column: Offers & Negotiation Form */}
        <div className="lg:col-span-8 space-y-6">
          {/* Make Offer Form (Only if not owner and deal is open) */}
          {!isOwner && currentDeal.status === "open" && (
            <div>
              {user ? (
                <MakeOfferForm
                  dealId={currentDeal.id}
                  suggestedBudgetMin={currentDeal.budget_min}
                  suggestedBudgetMax={currentDeal.budget_max}
                  onSuccess={() => {
                    if (id) {
                      dispatch(fetchOffersForDeal(id));
                      dispatch(fetchDealById(id));
                    }
                  }}
                />
              ) : (
                <div className="bg-[var(--surface)] rounded-3xl p-6 border border-[var(--line)] text-center space-y-3 shadow-xs">
                  <h3 className="font-bold text-sm text-[var(--ink)]">
                    Can you provide this resource or skill?
                  </h3>
                  <p className="text-xs text-[var(--muted)] font-normal">
                    Sign in to submit your price proposal and terms directly to the requester.
                  </p>
                  <Link
                    to="/login"
                    className="inline-block px-5 py-2.5 bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    Sign In to Make an Offer
                  </Link>
                </div>
              )}
            </div>
          )}

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

          {/* Submitted Offers List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--signal)]" />
                <h3 className="font-black text-[var(--ink)] text-base">
                  Community Proposals & Offers ({offers.length})
                </h3>
              </div>
              {hasAcceptedOffer && (
                <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  Deal Matched
                </span>
              )}
            </div>

            {offers.length === 0 ? (
              <div className="bg-[var(--surface)] rounded-3xl p-8 border border-[var(--line)] text-center space-y-2 shadow-xs">
                <p className="text-xs font-bold text-[var(--ink)]">No offers submitted yet.</p>
                <p className="text-xs text-[var(--muted)] font-normal">
                  {isOwner
                    ? "Nearby neighbors within your radar have been alerted. Check back soon!"
                    : "Be the first neighbor to submit terms for this need."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    currentUser={user}
                    dealOwnerId={currentDeal.user_id}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onWithdraw={handleWithdraw}
                    isActionLoading={offersState.actionLoading}
                  />
                ))}
              </div>
            )}
          </div>
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
