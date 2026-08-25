import React from "react";
import { Link } from "react-router-dom";
import { Deal } from "../../types";
import { CategoryBadge } from "../common/CategoryBadge";
import { StatusBadge } from "../common/StatusBadge";
import { ArrowRight, User, Star, MapPin, Sparkles, Send } from "lucide-react";

interface DealCardProps {
  deal: Deal;
  isSelected?: boolean;
  isHovered?: boolean;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
  onOpenOffer?: (deal: Deal) => void;
}

import { DEFAULT_CATEGORY_IMAGES } from "../../lib/categoryImages";
import { sanitizeUrl } from "../../lib/sanitize";

export function DealCard({
  deal,
  isSelected,
  isHovered,
  onHover,
  onSelect,
  onOpenOffer,
}: DealCardProps) {
  const fallbackUrl = DEFAULT_CATEGORY_IMAGES[deal.category] || DEFAULT_CATEGORY_IMAGES["Other"];
  const imageUrl = sanitizeUrl(deal.image_url, fallbackUrl);

  return (
    <div
      id={`deal-card-${deal.id}`}
      onMouseEnter={() => onHover && onHover(deal.id)}
      onMouseLeave={() => onHover && onHover(null)}
      onClick={() => onSelect && onSelect(deal.id)}
      className={`group bg-[var(--surface)] border rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-250 cursor-pointer shadow-xs hover:shadow-xl hover:-translate-y-1 ${
        isSelected
          ? "border-[var(--signal)] ring-2 ring-[var(--signal)]/30 shadow-lg -translate-y-1"
          : isHovered
          ? "border-[var(--signal)]/80 shadow-md -translate-y-1"
          : "border-[var(--line)] hover:border-[var(--signal)]/60"
      }`}
    >
      <div>
        {/* Item Image Header with Overlays */}
        <div className="relative h-44 w-full overflow-hidden bg-[var(--paper)]">
          <img
            src={imageUrl}
            alt={deal.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />

          {/* Category Badge Overlaid Top-Left */}
          <div className="absolute top-3 left-3 z-10">
            <CategoryBadge category={deal.category} />
          </div>

          {/* Status Badge Top-Right */}
          <div className="absolute top-3 right-3 z-10">
            <StatusBadge status={deal.status} />
          </div>

          {/* Distance & Location Overlaid Bottom-Left */}
          <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center justify-between text-white text-xs font-semibold">
            <div className="flex items-center gap-1.5 drop-shadow-md">
              <MapPin className="w-3.5 h-3.5 text-[var(--signal)]" />
              <span className="truncate max-w-[170px] text-[11px]">
                {deal.distance_km !== undefined ? `${deal.distance_km} km away` : deal.address || "Nearby"}
              </span>
            </div>

            <div className="bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-bold text-gray-200">
              {deal.radius_km}km radar
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-3">
          {/* Title */}
          <h4 className="font-black text-base text-[var(--ink)] group-hover:text-[var(--signal)] transition-colors line-clamp-1 tracking-tight leading-snug">
            {deal.title}
          </h4>

          {/* Description */}
          <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed font-normal">
            {deal.description}
          </p>

          {/* Creator Profile Mini Row */}
          {deal.creator && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                {deal.creator.profile_photo ? (
                  <img
                    src={deal.creator.profile_photo}
                    alt={deal.creator.username}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full object-cover border border-[var(--line)] shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {deal.creator.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-semibold text-[var(--ink)] truncate text-[11px]">
                  {deal.creator.username}
                </span>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 shrink-0">
                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                <span>{deal.creator.avg_rating?.toFixed(1) || "5.0"}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Meta: Budget Range & Action CTA */}
      <div className="px-5 py-3.5 bg-[var(--surface)]/50 border-t border-[var(--line)] flex items-center justify-between">
        <div>
          <span className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider block">
            Budget Range
          </span>
          <span className="text-base font-black text-[var(--signal)]">
            ₹{deal.budget_min}
            {deal.budget_max > deal.budget_min ? ` – ₹${deal.budget_max}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenOffer && deal.status === "open" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenOffer(deal);
              }}
              className="px-3 py-1.5 rounded-xl bg-[var(--signal)]/10 hover:bg-[var(--signal)] text-[var(--signal)] hover:text-white text-xs font-bold border border-[var(--signal)]/20 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
            >
              <Send className="w-3 h-3" />
              <span>Offer</span>
            </button>
          )}

          <Link
            to={`/deals/${deal.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] group-hover:border-[var(--signal)] group-hover:bg-[var(--signal)] text-[var(--muted)] group-hover:text-white transition-all shadow-xs"
            title="View Full Need & Offers"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
