import React, { useState, useRef, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { setRadiusKm } from "../../redux/slices/dealsSlice";
import { ChevronDown, Navigation } from "lucide-react";

const RADIUS_OPTIONS = [
  { value: 3, label: "3 km" },
  { value: 5, label: "5 km" },
  { value: 8, label: "8 km" },
  { value: 15, label: "15 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
];

export function RadiusSelector() {
  const dispatch = useAppDispatch();
  const radiusKm = useAppSelector((state) => state.deals.radiusKm);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="radius-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-1.5 bg-white/95 backdrop-blur-md rounded-xl text-xs font-semibold text-[#1A1A1A] border border-[#E5E5E2] shadow-xs hover:border-[#10B981] transition-all cursor-pointer"
        title="Change search radius"
      >
        <Navigation className="w-3.5 h-3.5 text-[#10B981]" />
        <span>{radiusKm} km radius</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-40 bg-white rounded-xl shadow-lg border border-[#E5E5E2] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[10px] font-black text-gray-400 uppercase tracking-wider">
            Search Radius
          </div>
          {RADIUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                dispatch(setRadiusKm(opt.value));
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                radiusKm === opt.value
                  ? "bg-[#F0FDF4] text-[#059669] font-bold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{opt.label}</span>
              {radiusKm === opt.value && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

