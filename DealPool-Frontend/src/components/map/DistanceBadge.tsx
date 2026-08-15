import React from "react";

interface DistanceBadgeProps {
  distanceKm?: number;
  className?: string;
}

export function formatDistance(distanceKm?: number): string {
  if (distanceKm === undefined || distanceKm === null || isNaN(distanceKm)) {
    return "Nearby";
  }
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

export function DistanceBadge({ distanceKm, className = "" }: DistanceBadgeProps) {
  const formatted = formatDistance(distanceKm);

  return (
    <div
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight bg-black/85 text-white/95 border border-white/20 shadow-md backdrop-blur-md whitespace-nowrap pointer-events-none select-none ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      <span>{formatted}</span>
    </div>
  );
}

export default DistanceBadge;
