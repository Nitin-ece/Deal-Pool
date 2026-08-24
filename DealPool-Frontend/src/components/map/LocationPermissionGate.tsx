import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import {
  requestUserLocation,
  setManualLocation,
} from "../../redux/slices/locationSlice";
import { PlacesAutocomplete } from "./PlacesAutocomplete";
import { RadarMap } from "./RadarMap";
import {
  MapPin,
  Crosshair,
  AlertCircle,
  Search,
  Navigation,
  Shield,
  Loader2,
} from "lucide-react";

interface LocationPermissionGateProps {
  className?: string;
  heightClass?: string;
}

export function LocationPermissionGate({
  className = "",
  heightClass = "h-[360px] sm:h-[420px] lg:h-[480px]",
}: LocationPermissionGateProps) {
  const dispatch = useAppDispatch();
  const { lat, lng, address, permission, error } = useAppSelector(
    (state) => state.location
  );

  const [searchAddress, setSearchAddress] = useState(address || "");
  const [hasPrompted, setHasPrompted] = useState(false);

  // On mount: One-time getCurrentPosition snapshot call (per spec: NO watchPosition)
  useEffect(() => {
    if (!hasPrompted && permission === "prompt") {
      setHasPrompted(true);
      dispatch(requestUserLocation());
    }
  }, [dispatch, hasPrompted, permission]);

  const handleManualLocationSelect = (selected: {
    address: string;
    lat: number;
    lng: number;
  }) => {
    setSearchAddress(selected.address);
    dispatch(
      setManualLocation({
        lat: selected.lat,
        lng: selected.lng,
        address: selected.address,
      })
    );
  };

  const handleRetryGps = () => {
    dispatch(requestUserLocation());
  };

  // If permission is loading on initial mount
  if (permission === "loading") {
    return (
      <div
        className={`relative w-full ${heightClass} bg-[#0c131f] rounded-3xl overflow-hidden border border-white/10 flex flex-col items-center justify-center p-6 text-white text-center shadow-2xl ${className}`}
      >
        <div className="relative flex items-center justify-center mb-4">
          <span className="w-16 h-16 rounded-full bg-[#FACC15]/20 animate-ping absolute" />
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-[#FACC15] shadow-lg">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </div>
        <h3 className="font-display text-lg font-bold text-white tracking-tight">
          Requesting Location Snapshot…
        </h3>
        <p className="text-xs text-white/60 max-w-sm mt-1 leading-relaxed">
          Allowing location access helps discover community needs and skill exchanges within your exact neighborhood radius.
        </p>
      </div>
    );
  }

  // If permission is denied or failed: Fallback UI with Google Places Autocomplete search input
  if (permission === "denied") {
    return (
      <div
        className={`relative w-full ${heightClass} bg-[#0c131f] rounded-3xl overflow-hidden border border-amber-500/30 flex flex-col justify-center p-6 sm:p-10 text-white shadow-2xl ${className}`}
      >
        {/* Background ambient gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-blue-500/5 pointer-events-none" />

        <div className="relative z-10 max-w-xl mx-auto w-full space-y-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 shadow-lg">
              <MapPin className="w-7 h-7 animate-bounce" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                <AlertCircle className="w-3 h-3" />
                <span>Location Access Disabled</span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                Select Your Neighborhood
              </h3>
              <p className="text-xs text-white/70 leading-relaxed">
                We couldn’t read your GPS coordinates. Type your street address or landmark below to anchor your local radar.
              </p>
            </div>
          </div>

          {/* Autocomplete Input Search */}
          <div className="pt-2">
            <PlacesAutocomplete
              value={searchAddress}
              lat={lat}
              lng={lng}
              onChange={handleManualLocationSelect}
              placeholder="Search your area, neighborhood, street, or landmark..."
            />
          </div>

          {/* Quick Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-white/60 border-t border-white/10">
            <button
              type="button"
              onClick={handleRetryGps}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 text-[#FACC15]" />
              <span>Retry Browser GPS</span>
            </button>

            <div className="flex items-center gap-1 text-[11px] text-emerald-400/90">
              <Shield className="w-3.5 h-3.5" />
              <span>Exact coordinates shielded for your privacy</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Permission granted (or manual address set): Render RadarMap
  return (
    <RadarMap
      className={className}
      heightClass={heightClass}
      onRefreshLocation={handleRetryGps}
    />
  );
}

export default LocationPermissionGate;
