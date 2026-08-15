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
import { mutedMapStyle } from "./mapStyle";
import {
  RotateCw,
  ExternalLink,
  X,
  Shield,
  Plus,
  Minus,
  Navigation,
} from "lucide-react";
import { Link } from "react-router-dom";

declare global {
  interface Window {
    google?: any;
    initGoogleMapCallback?: () => void;
  }
}

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

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const [googleMapsReady, setGoogleMapsReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(14);

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

  // Dynamic Google Maps Script Loader & Map Instantiation
  useEffect(() => {
    const googleApiKey =
      (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || "";

    const initMap = () => {
      if (!mapContainerRef.current || !window.google?.maps) return;

      try {
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: { lat: location.lat, lng: location.lng },
          zoom: radiusKm <= 2 ? 16 : radiusKm <= 5 ? 15 : radiusKm <= 10 ? 14 : 13,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: "greedy",
          styles: mutedMapStyle,
        });

        googleMapInstanceRef.current = map;
        setGoogleMapsReady(true);
      } catch (err) {
        console.warn("Could not initialize Google Maps instance:", err);
      }
    };

    if (window.google?.maps) {
      initMap();
    } else if (googleApiKey) {
      const existingScript = document.getElementById("google-maps-sdk");
      if (!existingScript) {
        window.initGoogleMapCallback = () => initMap();
        const script = document.createElement("script");
        script.id = "google-maps-sdk";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places&callback=initGoogleMapCallback`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      } else {
        const checkInterval = setInterval(() => {
          if (window.google?.maps) {
            clearInterval(checkInterval);
            initMap();
          }
        }, 300);
        return () => clearInterval(checkInterval);
      }
    }
  }, [location.lat, location.lng, radiusKm]);

  // Recenter Google Maps instance when center changes
  useEffect(() => {
    if (googleMapInstanceRef.current && location.lat && location.lng) {
      googleMapInstanceRef.current.panTo({
        lat: location.lat,
        lng: location.lng,
      });
    }
  }, [location.lat, location.lng]);

  // Zoom handlers for map
  const handleZoomIn = () => {
    setZoomLevel((z) => Math.min(18, z + 1));
    if (googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom(
        googleMapInstanceRef.current.getZoom() + 1
      );
    }
  };

  const handleZoomOut = () => {
    setZoomLevel((z) => Math.max(10, z - 1));
    if (googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom(
        googleMapInstanceRef.current.getZoom() - 1
      );
    }
  };

  const handleResetCenter = () => {
    if (googleMapInstanceRef.current && location.lat && location.lng) {
      googleMapInstanceRef.current.panTo({
        lat: location.lat,
        lng: location.lng,
      });
      googleMapInstanceRef.current.setZoom(15);
    }
  };

  // Coordinate projection for overlay marker placement
  // 1 degree latitude ~ 111 km
  const kmToDegree = 1 / 111;
  const zoomScale = Math.pow(1.3, zoomLevel - 14);
  const viewRadiusDegree = (radiusKm * 1.35 * kmToDegree) / zoomScale;

  const projectCoordinates = (lat: number, lng: number) => {
    const dLat = lat - location.lat;
    const dLng = (lng - location.lng) * Math.cos((location.lat * Math.PI) / 180);

    const x = 500 + (dLng / viewRadiusDegree) * 420;
    const y = 500 - (dLat / viewRadiusDegree) * 420;

    return {
      x: Math.max(40, Math.min(960, x)),
      y: Math.max(40, Math.min(960, y)),
    };
  };

  const hasNoMarkers = displayMarkers.length === 0;

  // Real-world Zomato/Blinkit light map tile background calculations (CartoDB Positron / OSM light)
  // Calculates real slippy map tile coordinates centered at user lat/lng
  const latRad = (location.lat * Math.PI) / 180;
  const n = Math.pow(2, 14);
  const tileX = Math.floor(((location.lng + 180) / 360) * n);
  const tileY = Math.floor(
    ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n
  );

  return (
    <div
      id="radar-map-discovery"
      className={`relative w-full ${heightClass} bg-[#f5f6f8] rounded-3xl overflow-hidden border border-[#E5E5E2] shadow-xl select-none transition-all ${className}`}
    >
      {/* 1. Real Google Maps DOM container (initialized with mutedMapStyle) */}
      <div
        ref={mapContainerRef}
        id="google-map-canvas"
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* 2. Seamless High-Definition Light Muted Carto Tiles Background (Zomato/Blinkit light skin) */}
      {!googleMapsReady && (
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -inset-24 grid grid-cols-3 grid-rows-3 opacity-90 contrast-[1.05] brightness-[1.02]">
            {[-1, 0, 1].map((dy) =>
              [-1, 0, 1].map((dx) => (
                <img
                  key={`${dx}-${dy}`}
                  src={`https://a.basemaps.cartocdn.com/rastertiles/voyager_nolabels/14/${tileX + dx}/${tileY + dy}.png`}
                  alt=""
                  className="w-full h-full object-cover select-none"
                  onError={(e) => {
                    // Fallback to OSM Light tile if cartoCDN throttles
                    (e.target as HTMLImageElement).src = `https://tile.openstreetmap.org/14/${tileX + dx}/${tileY + dy}.png`;
                  }}
                />
              ))
            )}
          </div>
          {/* Soft Zomato/Blinkit Muted Light Tint */}
          <div className="absolute inset-0 bg-[#f8f9fa]/25 backdrop-blur-[0.3px]" />
        </div>
      )}

      {/* 3. Concentric Radar Distance Wave Overlays */}
      <svg
        viewBox="0 0 1000 1000"
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="zomatoRadarSweep" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#10B981" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Concentric Subtle Radar Rings */}
        <circle
          cx="500"
          cy="500"
          r="140"
          fill="none"
          stroke="#10B981"
          strokeWidth="1.2"
          strokeDasharray="4 4"
          opacity="0.45"
        />
        <circle
          cx="500"
          cy="500"
          r="280"
          fill="none"
          stroke="#10B981"
          strokeWidth="1.2"
          strokeDasharray="5 5"
          opacity="0.35"
        />
        <circle
          cx="500"
          cy="500"
          r="420"
          fill="none"
          stroke="#10B981"
          strokeWidth="1.5"
          opacity="0.4"
        />

        {/* Radar Sweep Rotating Beam */}
        <g className="animate-radar-sweep origin-center" style={{ transformOrigin: "500px 500px" }}>
          <path d="M 500 500 L 920 500 A 420 420 0 0 0 500 80 Z" fill="url(#zomatoRadarSweep)" />
          <line x1="500" y1="500" x2="920" y2="500" stroke="#10B981" strokeWidth="1.8" opacity="0.65" />
        </g>
      </svg>

      {/* 4. Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Radar Location Badge */}
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E5E5E2] text-slate-800 shadow-md">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FACC15] opacity-85"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FACC15] border border-black/20"></span>
          </span>
          <span className="text-xs font-extrabold tracking-tight text-slate-900">
            {location.cityName || "Radar Center"}
          </span>
          <span className="text-slate-300 text-xs">·</span>
          <span className="text-[11px] font-semibold text-slate-500">
            {radiusKm} km radius
          </span>
        </div>

        {/* Right: Manual Refresh Button & Radius Chips */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Manual Refresh Button (The ONLY way the map updates, per spec) */}
          <button
            type="button"
            id="radar-refresh-btn"
            onClick={handleManualRefresh}
            disabled={isFetching}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white active:scale-95 text-xs font-bold text-slate-800 backdrop-blur-md border border-[#E5E5E2] shadow-md transition-all cursor-pointer ${
              isFetching ? "opacity-75" : ""
            }`}
            title="Refresh location & radar data"
          >
            <RotateCw
              className={`w-3.5 h-3.5 text-[#059669] ${isFetching ? "animate-spin" : ""}`}
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

      {/* 5. Center User Marker: Yellow Dot (#FACC15) with Pulsing Radar Ring (Blinkit/Zomato style ping) */}
      <div
        style={{ left: "50%", top: "50%" }}
        className="absolute z-20 pointer-events-auto"
      >
        <MapMarker marker={selfMarker} />
      </div>

      {/* 6. Needs (Blue Dot #3B82F6) & Offers (Red Dot #EF4444) Custom Overlay Markers */}
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

      {/* 7. Bottom Left Filter Chips (All / Needs / Offers) */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white/95 backdrop-blur-md border border-[#E5E5E2] text-slate-800 shadow-md">
        <button
          type="button"
          onClick={() => dispatch(setActiveFilter("all"))}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
            activeFilter === "all"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          All ({discoveryData?.total || 0})
        </button>
        <button
          type="button"
          onClick={() => dispatch(setActiveFilter("needs"))}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
            activeFilter === "needs"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-blue-600 hover:bg-blue-50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
          <span>Needs ({discoveryData?.needs?.length || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => dispatch(setActiveFilter("offers"))}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
            activeFilter === "offers"
              ? "bg-rose-600 text-white shadow-xs"
              : "text-rose-600 hover:bg-rose-50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
          <span>Offers ({discoveryData?.offers?.length || 0})</span>
        </button>
      </div>

      {/* 8. Bottom Right Floating Map Zoom & Recenter Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md border border-[#E5E5E2] shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md border border-[#E5E5E2] shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleResetCenter}
          className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md border border-[#E5E5E2] shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          title="Center on Your GPS"
        >
          <Navigation className="w-3.5 h-3.5 text-[#059669]" />
        </button>
      </div>

      {/* 9. Empty State Message when no nearby needs or offers are available */}
      {hasNoMarkers && !isFetchingData && (
        <MapEmptyState
          radiusKm={radiusKm}
          onExpandRadius={() => dispatch(setRadiusKm(25))}
        />
      )}

      {/* 10. Selected Marker Detail Floating Popup */}
      {selectedMarker && selectedMarker.type !== "self" && (
        <div className="absolute bottom-4 right-16 z-40 max-w-xs sm:max-w-sm w-full p-4 rounded-2xl bg-white/98 backdrop-blur-xl border border-[#E5E5E2] text-slate-900 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    selectedMarker.type === "need" ? "#3B82F6" : "#EF4444",
                }}
              />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {selectedMarker.type === "need" ? "Community Need" : "Local Offer"}
              </span>
              {selectedMarker.distanceKm !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                  {selectedMarker.distanceKm < 1
                    ? `${Math.round(selectedMarker.distanceKm * 1000)} m away`
                    : `${selectedMarker.distanceKm} km away`}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => dispatch(setSelectedMarker(null))}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h4 className="font-bold text-sm text-slate-900 mt-2 line-clamp-1">
            {selectedMarker.title}
          </h4>
          {selectedMarker.description && (
            <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
              {selectedMarker.description}
            </p>
          )}

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Budget / Value</span>
              <span className="text-xs font-extrabold text-[#059669]">
                ₹{selectedMarker.budgetMin || 0}
                {selectedMarker.budgetMax && selectedMarker.budgetMax > (selectedMarker.budgetMin || 0)
                  ? ` – ₹${selectedMarker.budgetMax}`
                  : ""}
              </span>
            </div>

            <Link
              to={`/deals/${selectedMarker.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              <span>View Deal</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {/* Privacy shielded notice */}
          <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
            <Shield className="w-3 h-3 text-[#059669]" />
            <span>Approximate location displayed for privacy</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default RadarMap;
