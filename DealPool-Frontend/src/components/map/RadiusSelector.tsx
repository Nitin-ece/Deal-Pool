import React from "react";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { setRadiusKm as setMapRadiusKm } from "../../redux/slices/mapSlice";
import { setRadiusKm as setDealsRadiusKm } from "../../redux/slices/dealsSlice";

const RADIUS_OPTIONS = [1, 5, 10, 25];

interface RadiusSelectorProps {
  value?: number;
  onChange?: (radius: number) => void;
  className?: string;
}

export function RadiusSelector({ value, onChange, className = "" }: RadiusSelectorProps) {
  const dispatch = useAppDispatch();
  const mapRadius = useAppSelector((state) => state.map.radiusKm);
  const activeRadius = value !== undefined ? value : mapRadius;

  const handleSelect = (r: number) => {
    if (onChange) {
      onChange(r);
    } else {
      dispatch(setMapRadiusKm(r));
      dispatch(setDealsRadiusKm(r));
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1 p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 shadow-sm ${className}`}
    >
      <span className="text-[10px] font-bold text-white/50 px-1.5 uppercase tracking-wider hidden sm:inline">
        Radius
      </span>
      {RADIUS_OPTIONS.map((r) => {
        const isSelected = activeRadius === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => handleSelect(r)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
              isSelected
                ? "bg-white text-slate-900 shadow-sm scale-100"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            {r}km
          </button>
        );
      })}
    </div>
  );
}

export default RadiusSelector;
