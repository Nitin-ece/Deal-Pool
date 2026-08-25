import { useState } from "react";
import { MapPin, Crosshair, X, Sparkles } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { requestUserLocation } from "../../redux/slices/locationSlice";
import { setUserLocation } from "../../redux/slices/dealsSlice";

export function LocationPrompt() {
  const dispatch = useAppDispatch();
  const location = useAppSelector((state) => state.location);
  const [dismissed, setDismissed] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // If permission is already granted or user dismissed this session
  if (dismissed || location.permission === "granted") {
    return null;
  }

  const handleRequestGps = () => {
    setIsLocating(true);
    dispatch(requestUserLocation())
      .unwrap()
      .then((res) => {
        dispatch(setUserLocation(res));
      })
      .finally(() => {
        setIsLocating(false);
      });
  };

  return (
    <aside
      aria-label="Location services notification"
      className="relative z-30 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-950 via-[#0c131f] to-emerald-950 px-4 py-3 text-white shadow-md animate-in slide-in-from-top duration-200"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <MapPin className="h-4 w-4 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-white">
              <span>Enable Neighborhood Radar</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300">
                <Sparkles className="h-2.5 w-2.5" /> Hyperlocal
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/70 sm:text-xs">
              Allow location access to automatically discover deals, equipment & skills near you.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRequestGps}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Crosshair className="h-3.5 w-3.5" />
            <span>{isLocating ? "Requesting GPS…" : "Allow Location Access"}</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss location notification"
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
