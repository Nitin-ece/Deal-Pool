import React from "react";
import { DistanceBadge } from "./DistanceBadge";
import { DiscoveryMarker } from "../../redux/slices/mapSlice";

interface MapMarkerProps {
  marker: DiscoveryMarker;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: (marker: DiscoveryMarker) => void;
  onMouseEnter?: (marker: DiscoveryMarker) => void;
  onMouseLeave?: () => void;
}

export function MapMarker({
  marker,
  isSelected = false,
  isHovered = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: MapMarkerProps) {
  const isSelf = marker.type === "self";
  const isNeed = marker.type === "need";
  const isOffer = marker.type === "offer";

  // Marker Colors per specification:
  // Self: Yellow (#FACC15)
  // Needs: Blue (#3B82F6)
  // Offers: Red (#EF4444)
  const dotColor = isSelf
    ? "#FACC15"
    : isNeed
    ? "#3B82F6"
    : "#EF4444";

  return (
    <div
      className="relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(marker);
      }}
      onMouseEnter={() => onMouseEnter?.(marker)}
      onMouseLeave={() => onMouseLeave?.()}
    >
      {/* Floating Distance Label for non-self markers */}
      {!isSelf && (
        <div className="absolute -top-7 z-30 transition-transform duration-200 group-hover:scale-110">
          <DistanceBadge distanceKm={marker.distanceKm} />
        </div>
      )}

      {/* Self Marker: Yellow Dot with Pulsing Radar Ring Animation (Blinkit/Zomato style ping) */}
      {isSelf ? (
        <div className="relative flex items-center justify-center">
          {/* Outer Pulsing Radar Ring */}
          <span
            className="absolute w-12 h-12 rounded-full opacity-75 animate-ping"
            style={{ backgroundColor: "#FACC15" }}
          />
          {/* Secondary Soft Pulse Wave */}
          <span
            className="absolute w-8 h-8 rounded-full opacity-40 animate-pulse"
            style={{ backgroundColor: "#FACC15" }}
          />
          {/* Solid Core Yellow Dot */}
          <span
            className="relative flex items-center justify-center w-5 h-5 rounded-full border-2 border-white shadow-lg z-10"
            style={{ backgroundColor: "#FACC15" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-black/60" />
          </span>

          {/* Self Label */}
          <div className="absolute top-6 px-2 py-0.5 rounded-md bg-black/85 text-[10px] font-bold text-[#FACC15] border border-[#FACC15]/30 shadow-md backdrop-blur-md whitespace-nowrap pointer-events-none">
            You
          </div>
        </div>
      ) : (
        /* Needs (Blue) & Offers (Red) Dot Markers */
        <div
          className={`relative flex items-center justify-center transition-all duration-200 ${
            isSelected
              ? "scale-125 ring-4 ring-white/60 z-30 shadow-xl"
              : isHovered
              ? "scale-115 z-20"
              : "group-hover:scale-110"
          }`}
        >
          {/* Subtle glow */}
          <span
            className="absolute w-7 h-7 rounded-full opacity-30 blur-[2px]"
            style={{ backgroundColor: dotColor }}
          />

          {/* Core Colored Dot Marker */}
          <span
            className="relative w-4 h-4 rounded-full border-2 border-white shadow-md flex items-center justify-center"
            style={{ backgroundColor: dotColor }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
          </span>

          {/* Mini tooltip title on hover */}
          <div
            className={`absolute top-5 px-2 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] font-semibold border border-white/10 shadow-lg whitespace-nowrap pointer-events-none transition-opacity duration-150 ${
              isHovered || isSelected ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          >
            <span className="font-bold mr-1" style={{ color: dotColor }}>
              {isNeed ? "Need:" : "Offer:"}
            </span>
            <span>{marker.title}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapMarker;
