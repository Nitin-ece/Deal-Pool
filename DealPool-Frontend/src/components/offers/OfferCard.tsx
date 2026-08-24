import React from "react";
import { Offer, UserProfile } from "../../types";
import { StatusBadge } from "../common/StatusBadge";
import { Star, CheckCircle, XCircle, Undo2, Clock, User } from "lucide-react";

interface OfferCardProps {
  offer: Offer;
  currentUser: UserProfile | null;
  dealOwnerId: string;
  onAccept?: (offerId: string) => void;
  onReject?: (offerId: string) => void;
  onWithdraw?: (offerId: string) => void;
  isActionLoading?: boolean;
}

export function OfferCard({
  offer,
  currentUser,
  dealOwnerId,
  onAccept,
  onReject,
  onWithdraw,
  isActionLoading = false,
}: OfferCardProps) {
  const isDealOwner = currentUser?.id === dealOwnerId;
  const isProvider = currentUser?.id === offer.provider_id;
  const isAccepted = offer.status === "accepted";
  const isPending = offer.status === "pending";

  const formatTimeAgo = (isoDate: string) => {
    try {
      const diffMs = Date.now() - new Date(isoDate).getTime();
      const hours = Math.floor(diffMs / 3600000);
      if (hours < 1) return "Just now";
      if (hours < 24) return `${hours} hours ago`;
      const days = Math.floor(hours / 24);
      return `${days} days ago`;
    } catch {
      return "Recently";
    }
  };

  return (
    <div
      id={`offer-card-${offer.id}`}
      className={`p-5 rounded-2xl border transition-all ${
        isAccepted
          ? "bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20"
          : "bg-[var(--surface)] border-[var(--line)] shadow-xs hover:border-[var(--signal)]/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Provider Identity */}
        <div className="flex items-center gap-3">
          {offer.provider?.profile_photo ? (
            <img
              src={offer.provider.profile_photo}
              alt={offer.provider.username || "Provider"}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border border-[var(--line)]"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--signal)]/10 text-[var(--signal)] flex items-center justify-center font-bold text-sm border border-[var(--line)]">
              <User className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--ink)] text-sm">
                {offer.provider?.username || "Community Provider"}
              </span>
              {offer.provider?.avg_rating && (
                <div className="flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md font-semibold">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                  <span>{offer.provider.avg_rating.toFixed(1)}</span>
                  <span className="text-[var(--muted)] font-normal">({offer.provider.rating_count || 0})</span>
                </div>
              )}
            </div>
            <div className="text-[11px] text-[var(--muted)] flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              <span>Offered {formatTimeAgo(offer.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Offered Price */}
        <div className="text-right">
          <div className="text-base font-black text-[var(--signal)]">₹{offer.price}</div>
          <div className="mt-1">
            <StatusBadge status={offer.status} />
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="mt-3 text-xs text-[var(--ink)] bg-[var(--paper)] p-3.5 rounded-xl border border-[var(--line)] leading-relaxed">
        {offer.terms}
      </div>

      {/* Action buttons */}
      {isPending && (
        <div className="mt-3.5 pt-3 border-t border-[var(--line)] flex items-center justify-end gap-2">
          {/* Owner can accept or reject */}
          {isDealOwner && (
            <>
              <button
                type="button"
                id={`reject-offer-${offer.id}`}
                disabled={isActionLoading}
                onClick={() => onReject && onReject(offer.id)}
                className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Decline</span>
              </button>
              <button
                type="button"
                id={`accept-offer-${offer.id}`}
                disabled={isActionLoading}
                onClick={() => onAccept && onAccept(offer.id)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Accept Offer</span>
              </button>
            </>
          )}

          {/* Provider can withdraw their own offer */}
          {isProvider && !isDealOwner && (
            <button
              type="button"
              id={`withdraw-offer-${offer.id}`}
              disabled={isActionLoading}
              onClick={() => onWithdraw && onWithdraw(offer.id)}
              className="px-3.5 py-1.5 rounded-xl border border-[var(--line)] text-[var(--muted)] hover:bg-[var(--line)]/40 hover:text-[var(--ink)] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Withdraw Offer</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

