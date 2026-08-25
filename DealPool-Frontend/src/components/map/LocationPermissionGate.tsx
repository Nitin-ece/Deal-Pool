import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { requestUserLocation } from "../../redux/slices/locationSlice";
import { setUserLocation } from "../../redux/slices/dealsSlice";
import { RadarMap } from "./RadarMap";
import {
  MapPin,
  Crosshair,
  AlertCircle,
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
  const { lat, lng, permission } = useAppSelector(
    (state) => state.location
  );

  const [hasPrompted, setHasPrompted] = useState(false);

  // On mount: One-time getCurrentPosition snapshot call
  useEffect(() => {
    if (!hasPrompted && permission === "prompt") {
      setHasPrompted(true);
      dispatch(requestUserLocation())
        .unwrap()
        .then((res) => {
          dispatch(setUserLocation(res));
        })
        .catch(() => {});
    }
  }, [dispatch, hasPrompted, permission]);

  const handleRetryGps = () => {
    dispatch(requestUserLocation())
      .unwrap()
      .then((res) => {
        dispatch(setUserLocation(res));
      })
      .catch(() => {});
  };

  // If permission is loading on initial mount
  if (permission === "loading") {
    return (
      <div
        className={`relative w-full ${heightClass} bg-[#0c131f] rounded-3xl overflow-hidden border border-white/10 flex flex-col items-center justify-center p-6 text-white text-center shadow-2xl ${className}`}
      >
        <div className="relative flex items-center justify-center mb-4">
          <span className="w-16 h-16 rounded-full bg-[#10B981]/20 animate-ping absolute" />
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-[#10B981] shadow-lg">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </div>
        <h3 className="font-display text-lg font-bold text-white tracking-tight">
          Detecting Your Location…
        </h3>
        <p className="text-xs text-white/60 max-w-sm mt-1 leading-relaxed">
          Retrieving GPS coordinates to display neighborhood deals and community resources nearby.
        </p>
      </div>
    );
  }

  // If permission is denied or no location detected
  if (permission === "denied" || (!lat && !lng)) {
    return (
      <div
        className={`relative w-full ${heightClass} bg-[#0c131f] rounded-3xl overflow-hidden border border-emerald-500/30 flex flex-col justify-center items-center p-6 sm:p-10 text-white text-center shadow-2xl ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/5 pointer-events-none" />

        <div className="relative z-10 max-w-md mx-auto w-full space-y-4 flex flex-col items-center">
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg">
            <MapPin className="w-8 h-8 animate-bounce" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
              <AlertCircle className="w-3 h-3" />
              <span>Location Access Required</span>
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
              Enable Location for Hyperlocal Deals
            </h3>
            <p className="text-xs text-white/70 leading-relaxed max-w-sm">
              DealPool uses your browser location to show available deals, tools, and skills around you. Please allow location access to activate the map radar.
            </p>
          </div>

          <div className="pt-2 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleRetryGps}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-500/25"
            >
              <Crosshair className="w-4 h-4" />
              <span>Allow GPS Location Access</span>
            </button>

            <div className="flex items-center gap-1 text-[11px] text-emerald-400/80">
              <Shield className="w-3.5 h-3.5" />
              <span>Exact coordinates are never exposed to other users</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Permission granted and coordinates available: Render RadarMap
  return (
    <RadarMap
      className={className}
      heightClass={heightClass}
      onRefreshLocation={handleRetryGps}
    />
  );
}

export default LocationPermissionGate;
