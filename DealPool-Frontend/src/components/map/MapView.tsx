import React, { useState, useRef, useMemo } from "react";
import { Deal } from "../../types";
import { RadiusSelector } from "./RadiusSelector";
import { MapPin, Navigation, Plus, Minus, Layers, Eye, ShieldCheck, Box, Code, Wrench, Package, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface MapViewProps {
  deals: Deal[];
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  selectedDealId: string | null;
  hoveredDealId: string | null;
  onSelectDeal?: (dealId: string) => void;
  onHoverDeal?: (dealId: string | null) => void;
  heightClass?: string;
  isDetailView?: boolean;
  exactLocationVisible?: boolean;
  approxDistanceKm?: number;
}

export function MapView({
  deals,
  centerLat,
  centerLng,
  radiusKm,
  selectedDealId,
  hoveredDealId,
  onSelectDeal,
  onHoverDeal,
  heightClass = "h-[420px] lg:h-[500px]",
  isDetailView = false,
  exactLocationVisible = true,
  approxDistanceKm,
}: MapViewProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activePopupDealId, setActivePopupDealId] = useState<string | null>(null);
  const [mapTheme, setMapTheme] = useState<"clean" | "satellite">("clean");

  // Approximate coordinate scale: 1 degree latitude ~ 111 km
  const kmToDegree = 1 / 111;
  const viewRadiusDegree = (radiusKm * 1.35 * kmToDegree) / zoomLevel;

  // Calculate pixel positions on 1000x1000 SVG coordinate grid
  const projectCoordinates = (lat: number, lng: number) => {
    const dLat = lat - centerLat;
    const dLng = (lng - centerLng) * Math.cos((centerLat * Math.PI) / 180);

    const x = 500 + (dLng / viewRadiusDegree) * 400;
    const y = 500 - (dLat / viewRadiusDegree) * 400;

    return { x: Math.max(40, Math.min(960, x)), y: Math.max(40, Math.min(960, y)) };
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Physical Resource":
        return <Box className="w-3.5 h-3.5" />;
      case "Skill":
        return <Code className="w-3.5 h-3.5" />;
      case "Service":
        return <Wrench className="w-3.5 h-3.5" />;
      case "Equipment":
        return <Package className="w-3.5 h-3.5" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5" />;
    }
  };

  const activeDeal = useMemo(
    () => deals.find((d) => d.id === (activePopupDealId || selectedDealId)),
    [deals, activePopupDealId, selectedDealId]
  );

  return (
    <div
      id="dealpool-map-container"
      className={`relative w-full ${heightClass} bg-[#e8f4ec] rounded-3xl overflow-hidden border border-emerald-100/80 shadow-inner select-none transition-all`}
    >
      {/* Background Cartography Vectors (Roads, Green Spaces, Waterways) */}
      <svg
        viewBox="0 0 1000 1000"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Subtle Grid Pattern */}
          <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d5e8db" strokeWidth="0.8" opacity="0.6" />
          </pattern>

          {/* Radar Center Gradient */}
          <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#10b981" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </radialGradient>

          <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
            <stop offset="40%" stopColor="#10b981" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Map Terrain Base */}
        <rect width="1000" height="1000" fill={mapTheme === "clean" ? "#eef6f0" : "#d8ebd9"} />
        <rect width="1000" height="1000" fill="url(#mapGrid)" />

        {/* Organic Park / Green Polygon */}
        <path
          d="M 120 180 Q 280 80 440 220 T 780 160 T 920 340 T 700 620 T 400 480 Z"
          fill="#d4ebd8"
          opacity="0.8"
        />
        <path
          d="M 60 680 Q 220 540 380 720 T 640 880 T 320 960 Z"
          fill="#d4ebd8"
          opacity="0.7"
        />

        {/* Stylized River / Water Canal */}
        <path
          d="M -50 420 Q 250 380 480 540 T 820 620 T 1050 820"
          fill="none"
          stroke="#bfdbfe"
          strokeWidth="32"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M -50 420 Q 250 380 480 540 T 820 620 T 1050 820"
          fill="none"
          stroke="#93c5fd"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Major Arterial Roads */}
        <path d="M 0 500 L 1000 500" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
        <path d="M 500 0 L 500 1000" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
        <path d="M 150 100 Q 500 450 850 900" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" />
        <path d="M 850 100 Q 500 550 150 900" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" />
        <circle cx="500" cy="500" r="140" fill="none" stroke="#ffffff" strokeWidth="10" />

        {/* Minor Local Road Network */}
        <path d="M 280 180 L 720 180 M 280 820 L 720 820" stroke="#ffffff" strokeWidth="6" strokeDasharray="6 4" opacity="0.8" />
        <path d="M 180 280 L 180 720 M 820 280 L 820 720" stroke="#ffffff" strokeWidth="6" strokeDasharray="6 4" opacity="0.8" />

        {/* Radar Center Gradient */}
        <circle cx="500" cy="500" r="380" fill="url(#radarGlow)" />

        {/* Concentric Distance Rings matching MakerPool visual reference */}
        <circle
          cx="500"
          cy="500"
          r="160"
          fill="none"
          stroke="#10b981"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.5"
        />
        <circle
          cx="500"
          cy="500"
          r="270"
          fill="none"
          stroke="#10b981"
          strokeWidth="1.5"
          strokeDasharray="5 5"
          opacity="0.4"
        />
        <circle
          cx="500"
          cy="500"
          r="380"
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          opacity="0.6"
        />

        {/* Rotating Radar Sweep Animation */}
        <g className="animate-radar-sweep origin-center" style={{ transformOrigin: "500px 500px" }}>
          <path d="M 500 500 L 880 500 A 380 380 0 0 0 500 120 Z" fill="url(#radarSweep)" />
          <line x1="500" y1="500" x2="880" y2="500" stroke="#10b981" strokeWidth="2" opacity="0.7" />
        </g>
      </svg>

      {/* Floating Top Bar with Radius Selector */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-sm border border-slate-200/80">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-xs font-semibold text-slate-800">
            {deals.length} {deals.length === 1 ? "Deal" : "Deals"} nearby
          </span>
          <span className="text-slate-300 text-xs">|</span>
          <span className="text-[11px] text-slate-500">Live Radar</span>
        </div>

        {!isDetailView && (
          <div className="pointer-events-auto">
            <RadiusSelector />
          </div>
        )}
      </div>

      {/* Center Marker (User Location or Search Center) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none flex flex-col items-center"
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 animate-ping absolute inset-0 -m-1"></div>
          <div className="w-6 h-6 rounded-full bg-emerald-600 border-2 border-white shadow-md flex items-center justify-center text-white text-[10px]">
            <Navigation className="w-3.5 h-3.5 fill-current" />
          </div>
        </div>
        <div className="mt-1 px-2 py-0.5 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-semibold rounded-md shadow-xs">
          Your Location
        </div>
      </div>

      {/* Interactive Deal Markers */}
      {!isDetailView &&
        deals.map((deal) => {
          const { x, y } = projectCoordinates(deal.lat, deal.lng);
          const isSelected = selectedDealId === deal.id || activePopupDealId === deal.id;
          const isHovered = hoveredDealId === deal.id;

          return (
            <div
              key={deal.id}
              style={{
                left: `${(x / 1000) * 100}%`,
                top: `${(y / 1000) * 100}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-transform duration-200"
            >
              <button
                type="button"
                id={`marker-${deal.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePopupDealId(deal.id);
                  if (onSelectDeal) onSelectDeal(deal.id);
                }}
                onMouseEnter={() => onHoverDeal && onHoverDeal(deal.id)}
                onMouseLeave={() => onHoverDeal && onHoverDeal(null)}
                className={`relative group flex items-center justify-center transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? "scale-125 z-30 ring-4 ring-emerald-400/50"
                    : isHovered
                    ? "scale-115 z-25"
                    : "hover:scale-110"
                }`}
                title={deal.title}
              >
                {/* Visual Marker Badge with Creator Photo or Icon */}
                <div
                  className={`w-10 h-10 rounded-full border-2 p-0.5 flex items-center justify-center overflow-hidden transition-all shadow-md ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-white bg-slate-900 text-white hover:border-emerald-500"
                  }`}
                >
                  {deal.creator?.profile_photo ? (
                    <img
                      src={deal.creator.profile_photo}
                      alt={deal.creator.username || "User"}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-emerald-400">
                      {getCategoryIcon(deal.category)}
                    </div>
                  )}
                </div>

                {/* Price / Category mini badge */}
                <div
                  className={`absolute -bottom-1.5 px-1.5 py-0.2 text-[9px] font-bold rounded-full border whitespace-nowrap shadow-xs ${
                    isSelected
                      ? "bg-emerald-600 text-white border-white"
                      : "bg-white text-slate-800 border-slate-200"
                  }`}
                >
                  ₹{deal.budget_max || deal.budget_min}
                </div>
              </button>
            </div>
          );
        })}

      {/* Detail View Specialized Radius/Pin Display per §6 */}
      {isDetailView && (
        <>
          {exactLocationVisible ? (
            // Exact Pin when viewer is owner or accepted provider
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center animate-bounce">
              <div className="p-2 rounded-full bg-emerald-600 text-white shadow-lg ring-4 ring-emerald-200">
                <MapPin className="w-6 h-6 fill-current" />
              </div>
              <div className="mt-2 px-3 py-1 bg-white text-slate-800 text-xs font-bold rounded-xl shadow-md border border-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Exact Location</span>
              </div>
            </div>
          ) : (
            // Fuzzy approximate circle when viewing anonymously / stranger
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 rounded-full bg-emerald-500/15 border-2 border-dashed border-emerald-500/60 animate-pulse flex items-center justify-center">
                <div className="p-2.5 rounded-full bg-emerald-600/90 text-white shadow-md">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Interactive Marker Popover Card */}
      {activeDeal && !isDetailView && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200 z-40 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              {activeDeal.category}
            </div>
            <button
              onClick={() => setActivePopupDealId(null)}
              className="text-slate-400 hover:text-slate-600 p-1 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>

          <h4 className="font-bold text-slate-900 text-sm mt-1.5 line-clamp-1">{activeDeal.title}</h4>
          <p className="text-slate-500 text-xs mt-1 line-clamp-2">{activeDeal.description}</p>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400">Budget</div>
              <div className="text-sm font-bold text-emerald-600">
                ₹{activeDeal.budget_min} {activeDeal.budget_max > activeDeal.budget_min && `– ₹${activeDeal.budget_max}`}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeDeal.distance_km !== undefined && (
                <div className="text-[11px] text-slate-500 flex items-center gap-0.5">
                  <Navigation className="w-3 h-3 text-slate-400" />
                  <span>{activeDeal.distance_km} km</span>
                </div>
              )}
              <Link
                to={`/deals/${activeDeal.id}`}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                View Deal
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom-Right Map Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-20">
        <button
          id="map-zoom-in"
          type="button"
          onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.3))}
          className="w-8 h-8 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          id="map-zoom-out"
          type="button"
          onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.3))}
          className="w-8 h-8 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          id="map-reset-zoom"
          type="button"
          onClick={() => setZoomLevel(1)}
          className="w-8 h-8 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
          title="Reset View"
        >
          <Navigation className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Location Privacy Note on Detail View */}
      {isDetailView && !exactLocationVisible && (
        <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            <span>Approx. {approxDistanceKm || 2.1} km away • Exact location hidden for privacy</span>
          </div>
          <span className="text-[10px] text-slate-400">Revealed upon accepted offer</span>
        </div>
      )}
    </div>
  );
}
