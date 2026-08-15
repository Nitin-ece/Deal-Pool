import React, { useState, useMemo, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import {
  setRadiusKm,
  setSelectedMarker,
  setHoveredMarkerId,
  setActiveFilter,
  DiscoveryMarker,
} from "../../redux/slices/mapSlice";
import { requestUserLocation } from "../../redux/slices/locationSlice";
import { useGetNearbyDiscoveryQuery } from "../../redux/services/discoveryApi";
import { MapMarker } from "./MapMarker";
import { RadiusSelector } from "./RadiusSelector";
import { MapEmptyState } from "./MapEmptyState";
import {
  Radio,
  RotateCw,
  Layers,
  MapPin,
  ExternalLink,
  X,
  Crosshair,
  Shield,
} from "lucide-react";
import { Link } from "react-router-dom";

interface RadarMapProps {
  className?: string;
  heightClass?: string;
  onRefreshLocation?: () => void;
}

export function RadarMap({
  className = "",
  heightClass = "h-[360px] sm:h-[420px] lg:h-[480px]",
  onRefreshLocation,
}: RadarMapProps) {
  const dispatch = useAppDispatch();
  const location = useAppSelector((state) => state.location);
  const { radiusKm, selectedMarker, hoveredMarkerId, activeFilter } = useAppSelector(
    (state) => state.map
  );

  const [mapZoom, setMapZoom] = useState<number>(1);
  const [mapTheme, setMapTheme] = useState<"radar" | "satellite">("radar");

  // Query nearby needs and offers server-side with distanceKm precomputed
  const {
    data: discoveryData,
    isLoading: isFetchingData,
    isFetching,
    refetch,
  } = useGetNearbyDiscoveryQuery(
    {
      lat: location.lat,
      lng: location.lng,
      radiusKm,
    },
    {
      skip: !location.lat || !location.lng,
    }
  );

  // Manual refresh handler: re-triggers snapshot location read + RTK query refetch
  const handleManualRefresh = () => {
    if (onRefreshLocation) {
      onRefreshLocation();
    } else {
      dispatch(requestUserLocation());
    }
    refetch();
  };

  // Construct self marker
  const selfMarker: DiscoveryMarker = useMemo(
    () => ({
      id: "self-user-marker",
      type: "self",
      title: "Your Location",
      lat: location.lat,
      lng: location.lng,
      distanceKm: 0,
    }),
    [location.lat, location.lng]
  );

  // Filtered markers based on active tab
  const displayMarkers = useMemo(() => {
    const rawNeeds = discoveryData?.needs || [];
    const rawOffers = discoveryData?.offers || [];

    let combined: DiscoveryMarker[] = [];

    if (activeFilter === "all" || activeFilter === "needs") {
      combined = [...combined, ...rawNeeds];
    }
    if (activeFilter === "all" || activeFilter === "offers") {
      combined = [...combined, ...rawOffers];
    }

    return combined;
  }, [discoveryData, activeFilter]);

  // Coordinate projection for canvas/overlay relative to user center and radius
  // 1 degree latitude ~ 111 km
  const kmToDegree = 1 / 111;
  const viewRadiusDegree = (radiusKm * 1.35 * kmToDegree) / mapZoom;

  const projectCoordinates = (lat: number, lng: number) => {
    const dLat = lat - location.lat;
    const dLng = (lng - location.lng) * Math.cos((location.lat * Math.PI) / 180);

    const x = 500 + (dLng / viewRadiusDegree) * 400;
    const y = 500 - (dLat / viewRadiusDegree) * 400;

    return {
      x: Math.max(50, Math.min(950, x)),
      y: Math.max(50, Math.min(950, y)),
    };
  };

  const hasNoMarkers = displayMarkers.length === 0;

  return (
    <div
      id="radar-map-discovery"
      className={`relative w-full ${heightClass} bg-[#0c131f] rounded-3xl overflow-hidden border border-white/10 shadow-2xl select-none transition-all ${className}`}
    >
      {/* Background Map Vectors with Modern Dark Radar Aesthetics */}
      <svg
        viewBox="0 0 1000 1000"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Subtle Grid Pattern */}
          <pattern id="radarGrid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1e293b" strokeWidth="0.75" opacity="0.45" />
          </pattern>

          {/* Radar Glowing Center */}
          <radialGradient id="centerRadarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FACC15" stopOpacity="0.20" />
            <stop offset="35%" stopColor="#3B82F6" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>

          {/* Rotating Radar Sweep Gradient */}
          <radialGradient id="radarSweepGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.30" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Map Background Base */}
        <rect width="1000" height="1000" fill="#080e1a" />
        <rect width="1000" height="1000" fill="url(#radarGrid)" />

        {/* Cartographic Waterways / Rivers */}
        <path
          d="M -50 350 Q 280 280 480 460 T 820 540 T 1050 780"
          fill="none"
          stroke="#1e3a5f"
          strokeWidth="24"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M -50 350 Q 280 280 480 460 T 820 540 T 1050 780"
          fill="none"
          stroke="#0284c7"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Cartographic Green Zones / Parks */}
        <path
          d="M 120 180 Q 280 90 440 220 T 780 160 T 920 340 T 700 620 T 400 480 Z"
          fill="#064e3b"
          opacity="0.25"
        />
        <path
          d="M 60 680 Q 220 540 380 720 T 640 880 T 320 960 Z"
          fill="#064e3b"
          opacity="0.22"
        />

        {/* Major Road Arteries */}
        <path d="M 0 500 L 1000 500" stroke="#334155" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
        <path d="M 500 0 L 500 1000" stroke="#334155" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
        <path d="M 150 100 Q 500 450 850 900" stroke="#334155" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
        <path d="M 850 100 Q 500 550 150 900" stroke="#334155" strokeWidth="5" strokeLinecap="round" opacity="0.5" />

        {/* Radar Center Gradient Glow */}
        <circle cx="500" cy="500" r="390" fill="url(#centerRadarGlow)" />

        {/* Concentric Distance Radar Rings */}
        <circle
          cx="500"
          cy="500"
          r="130"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.2"
          strokeDasharray="4 4"
          opacity="0.4"
        />
        <circle
          cx="500"
          cy="500"
          r="260"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.2"
          strokeDasharray="5 5"
          opacity="0.35"
        />
        <circle
          cx="500"
          cy="500"
          r="390"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.8"
          opacity="0.5"
        />

        {/* Radar Crosshair axes */}
        <line x1="500" y1="100" x2="500" y2="900" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3 6" opacity="0.3" />
        <line x1="100" y1="500" x2="900" y2="500" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3 6" opacity="0.3" />

        {/* Rotating Radar Sweep Animation */}
        <g className="animate-radar-sweep origin-center" style={{ transformOrigin: "500px 500px" }}>
          <path d="M 500 500 L 890 500 A 390 390 0 0 0 500 110 Z" fill="url(#radarSweepGradient)" />
          <line x1="500" y1="500" x2="890" y2="500" stroke="#38bdf8" strokeWidth="2" opacity="0.8" />
        </g>
      </svg>

      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Radar Status Badge & Address */}
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 text-white shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FACC15] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FACC15]"></span>
          </span>
          <span className="text-xs font-bold tracking-tight text-white/95">
            {location.cityName || "Radar Center"}
          </span>
          <span className="text-white/30 text-xs">·</span>
          <span className="text-[11px] text-white/70">{radiusKm} km radius</span>
        </div>

        {/* Right: Refresh Button & Radius Chips */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Manual Refresh Button (The ONLY way the map updates, per spec) */}
          <button
            type="button"
            id="radar-refresh-btn"
            onClick={handleManualRefresh}
            disabled={isFetching}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-bold text-white backdrop-blur-md border border-white/20 shadow-md transition-all cursor-pointer ${
              isFetching ? "opacity-75" : ""
            }`}
            title="Refresh location & radar data"
          >
            <RotateCw
              className={`w-3.5 h-3.5 text-[#FACC15] ${isFetching ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">{isFetching ? "Scanning…" : "Refresh"}</span>
          </button>

          {/* Radius Selector Chips (1km / 5km / 10km / 25km) */}
          <RadiusSelector
            value={radiusKm}
            onChange={(r) => dispatch(setRadiusKm(r))}
          />
        </div>
      </div>

      {/* Center Fixed User Location Marker (Yellow Dot #FACC15 with Pulsing Ping Ring) */}
      <div
        style={{ left: "50%", top: "50%" }}
        className="absolute z-20 pointer-events-auto"
      >
        <MapMarker marker={selfMarker} />
      </div>

      {/* Nearby Needs (Blue Dot #3B82F6) & Offers (Red Dot #EF4444) Custom Overlay Markers */}
      {displayMarkers.map((marker) => {
        const { x, y } = projectCoordinates(marker.lat, marker.lng);
        const isSelected = selectedMarker?.id === marker.id;
        const isHovered = hoveredMarkerId === marker.id;

        return (
          <div
            key={marker.id}
            style={{
              left: `${(x / 1000) * 100}%`,
              top: `${(y / 1000) * 100}%`,
            }}
            className="absolute z-20 pointer-events-auto transition-all duration-300"
          >
            <MapMarker
              marker={marker}
              isSelected={isSelected}
              isHovered={isHovered}
              onClick={(m) => dispatch(setSelectedMarker(m))}
              onMouseEnter={(m) => dispatch(setHoveredMarkerId(m.id))}
              onMouseLeave={() => dispatch(setHoveredMarkerId(null))}
            />
          </div>
        );
      })}

      {/* Legend & Filter Bar at Bottom Left */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-white">
        <button
          type="button"
          onClick={() => dispatch(setActiveFilter("all"))}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
            activeFilter === "all" ? "bg-white/25 text-white" : "text-white/60 hover:text-white"
          }`}
        >
          All ({discoveryData?.total || 0})
        </button>
        <button
          type="button"
          onClick={() => dispatch(setActiveFilter("needs"))}
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
            activeFilter === "needs" ? "bg-blue-600/50 text-blue-200" : "text-blue-400 hover:text-white"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
          <span>Needs ({discoveryData?.needs?.length || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => dispatch(setActiveFilter("offers"))}
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
            activeFilter === "offers" ? "bg-rose-600/50 text-rose-200" : "text-rose-400 hover:text-white"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
          <span>Offers ({discoveryData?.offers?.length || 0})</span>
        </button>
      </div>

      {/* Empty State Message when no nearby needs or offers are available */}
      {hasNoMarkers && !isFetchingData && (
        <MapEmptyState
          radiusKm={radiusKm}
          onExpandRadius={() => dispatch(setRadiusKm(25))}
        />
      )}

      {/* Selected Marker Detail Floating Popup */}
      {selectedMarker && selectedMarker.type !== "self" && (
        <div className="absolute bottom-4 right-4 z-40 max-w-xs sm:max-w-sm w-full p-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/20 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    selectedMarker.type === "need" ? "#3B82F6" : "#EF4444",
                }}
              />
              <span className="text-[10px] font-black uppercase tracking-wider text-white/70">
                {selectedMarker.type === "need" ? "Community Need" : "Local Offer"}
              </span>
              {selectedMarker.distanceKm !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/90">
                  {selectedMarker.distanceKm < 1
                    ? `${Math.round(selectedMarker.distanceKm * 1000)} m away`
                    : `${selectedMarker.distanceKm} km away`}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => dispatch(setSelectedMarker(null))}
              className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h4 className="font-bold text-sm text-white mt-2 line-clamp-1">
            {selectedMarker.title}
          </h4>
          {selectedMarker.description && (
            <p className="text-xs text-white/70 mt-1 line-clamp-2 leading-relaxed">
              {selectedMarker.description}
            </p>
          )}

          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-white/50 block">Budget / Value</span>
              <span className="text-xs font-extrabold text-[#FACC15]">
                ₹{selectedMarker.budgetMin || 0}
                {selectedMarker.budgetMax && selectedMarker.budgetMax > (selectedMarker.budgetMin || 0)
                  ? ` – ₹${selectedMarker.budgetMax}`
                  : ""}
              </span>
            </div>

            <Link
              to={`/deals/${selectedMarker.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-white/90 transition-colors"
            >
              <span>View Deal</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {/* Privacy shielded notice */}
          <div className="mt-2 flex items-center gap-1 text-[10px] text-white/40">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Approximate location displayed for privacy</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default RadarMap;
