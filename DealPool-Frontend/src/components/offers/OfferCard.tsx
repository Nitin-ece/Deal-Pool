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
          ? "bg-[#F0FDF4] border-[#10B981] ring-2 ring-[#10B981]/20"
          : "bg-white border-[#E5E5E2] shadow-xs hover:border-gray-300"
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
              className="w-10 h-10 rounded-full object-cover border border-[#E5E5E2]"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#F0FDF4] text-[#059669] flex items-center justify-center font-bold text-sm border border-[#E5E5E2]">
              <User className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1A1A1A] text-sm">
                {offer.provider?.username || "Community Provider"}
              </span>
              {offer.provider?.avg_rating && (
                <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md font-semibold">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                  <span>{offer.provider.avg_rating.toFixed(1)}</span>
                  <span className="text-gray-400 font-normal">({offer.provider.rating_count || 0})</span>
                </div>
              )}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              <span>Offered {formatTimeAgo(offer.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Offered Price */}
        <div className="text-right">
          <div className="text-base font-black text-[#10B981]">₹{offer.price}</div>
          <div className="mt-1">
            <StatusBadge status={offer.status} />
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="mt-3 text-xs text-gray-700 bg-gray-50 p-3.5 rounded-xl border border-gray-100 leading-relaxed">
        {offer.terms}
      </div>

      {/* Action buttons */}
      {isPending && (
        <div className="mt-3.5 pt-3 border-t border-[#E5E5E2] flex items-center justify-end gap-2">
          {/* Owner can accept or reject */}
          {isDealOwner && (
            <>
              <button
                type="button"
                id={`reject-offer-${offer.id}`}
                disabled={isActionLoading}
                onClick={() => onReject && onReject(offer.id)}
                className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Decline</span>
              </button>
              <button
                type="button"
                id={`accept-offer-${offer.id}`}
                disabled={isActionLoading}
                onClick={() => onAccept && onAccept(offer.id)}
                className="px-4 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
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
              className="px-3.5 py-1.5 rounded-xl border border-[#E5E5E2] text-gray-600 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
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

