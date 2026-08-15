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

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  "Physical Resource": "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80",
  "Skill": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80",
  "Service": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80",
  "Equipment": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80",
  "Other": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80",
};

export function DealCard({
  deal,
  isSelected,
  isHovered,
  onHover,
  onSelect,
  onOpenOffer,
}: DealCardProps) {
  const imageUrl = deal.image_url || DEFAULT_CATEGORY_IMAGES[deal.category] || DEFAULT_CATEGORY_IMAGES["Other"];

  return (
    <div
      id={`deal-card-${deal.id}`}
      onMouseEnter={() => onHover && onHover(deal.id)}
      onMouseLeave={() => onHover && onHover(null)}
      onClick={() => onSelect && onSelect(deal.id)}
      className={`group bg-white border rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-xs hover:shadow-lg ${
        isSelected
          ? "border-[var(--signal)] ring-2 ring-[var(--signal)]/25 shadow-md transform -translate-y-1"
          : isHovered
          ? "border-[var(--signal)]/80 shadow-md transform -translate-y-1"
          : "border-[var(--line)] hover:border-[var(--signal)]"
      }`}
    >
      <div>
        {/* Item Image Header with Overlays */}
        <div className="relative h-44 w-full overflow-hidden bg-gray-100">
          <img
            src={imageUrl}
            alt={deal.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

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
          <h4 className="font-black text-base text-[var(--ink)] group-hover:text-[var(--pool)] transition-colors line-clamp-1 tracking-tight leading-snug">
            {deal.title}
          </h4>

          {/* Description */}
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed font-normal">
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
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-[var(--pool)] text-[10px] font-bold flex items-center justify-center shrink-0">
                    {deal.creator.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-semibold text-gray-700 truncate text-[11px]">
                  {deal.creator.username}
                </span>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 shrink-0">
                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                <span>{deal.creator.avg_rating?.toFixed(1) || "5.0"}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Meta: Budget Range & Action CTA */}
      <div className="px-5 py-3.5 bg-gray-50/80 border-t border-[var(--line)] flex items-center justify-between">
        <div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
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
              className="px-3 py-1.5 rounded-xl bg-[var(--paper)] hover:bg-[var(--signal)] text-[var(--pool)] hover:text-white text-xs font-bold border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>Offer</span>
            </button>
          )}

          <Link
            to={`/deals/${deal.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-xl bg-white border border-[var(--line)] group-hover:border-[var(--signal)] group-hover:bg-[var(--signal)] text-gray-500 group-hover:text-white transition-all shadow-xs"
            title="View Full Need & Offers"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
