import React from "react";
import { Compass, Plus, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

interface MapEmptyStateProps {
  radiusKm: number;
  onExpandRadius?: () => void;
  className?: string;
}

export function MapEmptyState({
  radiusKm,
  onExpandRadius,
  className = "",
}: MapEmptyStateProps) {
  return (
    <div
      className={`absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-xs z-20 p-3.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/15 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-white/10 text-[#FACC15] shrink-0">
          <Compass className="w-5 h-5 animate-pulse" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-white/95">
            No needs or offers nearby yet.
          </p>
          <p className="text-[11px] text-white/60 leading-relaxed">
            Within {radiusKm} km. Expand your discovery range or broadcast a new community request.
          </p>
          <div className="flex items-center gap-2 pt-1.5">
            {onExpandRadius && radiusKm < 25 && (
              <button
                type="button"
                onClick={onExpandRadius}
                className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-bold text-white transition-colors cursor-pointer"
              >
                Expand to 25 km
              </button>
            )}
            <Link
              to="/deals/new"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[11px] font-bold text-white transition-colors"
            >
              <span>Post Need</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapEmptyState;
