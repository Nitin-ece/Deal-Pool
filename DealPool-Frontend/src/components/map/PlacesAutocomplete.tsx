import React, { useState, useEffect, useRef } from "react";
import { MapPin, Crosshair, Check } from "lucide-react";

interface PlaceSuggestion {
  address: string;
  lat: number;
  lng: number;
  area: string;
}

const POPULAR_AREAS: PlaceSuggestion[] = [
  { address: "Connaught Place, Central Delhi", area: "Central Delhi", lat: 28.6304, lng: 77.2177 },
  { address: "Barakhamba Road, New Delhi", area: "New Delhi", lat: 28.6328, lng: 77.2285 },
  { address: "Mandi House Cultural Hub, New Delhi", area: "New Delhi", lat: 28.6250, lng: 77.2340 },
  { address: "Gol Market, New Delhi", area: "Central Delhi", lat: 28.6185, lng: 77.2090 },
  { address: "Janpath Market Lane, New Delhi", area: "New Delhi", lat: 28.6360, lng: 77.2110 },
  { address: "Indiranagar 100ft Road, Bengaluru", area: "Bengaluru", lat: 12.9784, lng: 77.6408 },
  { address: "Koramangala 5th Block, Bengaluru", area: "Bengaluru", lat: 12.9352, lng: 77.6245 },
  { address: "Bandra West, Mumbai", area: "Mumbai", lat: 19.0596, lng: 72.8295 },
  { address: "Mission District, San Francisco", area: "San Francisco", lat: 37.7599, lng: -122.4148 },
  { address: "SoHo Broadway, New York", area: "New York", lat: 40.7128, lng: -74.0060 },
];

interface PlacesAutocompleteProps {
  value: string;
  lat: number;
  lng: number;
  onChange: (data: { address: string; lat: number; lng: number }) => void;
  placeholder?: string;
  error?: string;
}

export function PlacesAutocomplete({
  value,
  lat,
  lng,
  onChange,
  placeholder = "Search street address, neighborhood or landmark...",
  error,
}: PlacesAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<PlaceSuggestion[]>(POPULAR_AREAS);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredSuggestions(POPULAR_AREAS);
    } else {
      const q = inputValue.toLowerCase();
      const matches = POPULAR_AREAS.filter(
        (p) => p.address.toLowerCase().includes(q) || p.area.toLowerCase().includes(q)
      );
      if (matches.length > 0) {
        setFilteredSuggestions(matches);
      } else {
        // Generate pseudo-geocoded coordinates offset for custom query
        setFilteredSuggestions([
          {
            address: inputValue,
            area: "Custom Location",
            lat: lat || 28.6304 + (Math.random() - 0.5) * 0.05,
            lng: lng || 77.2177 + (Math.random() - 0.5) * 0.05,
          },
          ...POPULAR_AREAS.slice(0, 3),
        ]);
      }
    }
  }, [inputValue, lat, lng]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (place: PlaceSuggestion) => {
    setInputValue(place.address);
    setIsOpen(false);
    onChange({
      address: place.address,
      lat: Math.round(place.lat * 10000) / 10000,
      lng: Math.round(place.lng * 10000) / 10000,
    });
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const detectedLat = Math.round(pos.coords.latitude * 10000) / 10000;
        const detectedLng = Math.round(pos.coords.longitude * 10000) / 10000;
        const addr = `Detected Location (${detectedLat}, ${detectedLng})`;
        setInputValue(addr);
        setIsOpen(false);
        onChange({ address: addr, lat: detectedLat, lng: detectedLng });
      });
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative flex items-center">
        <MapPin className="absolute left-3.5 w-4 h-4 text-[#10B981] pointer-events-none" />
        <input
          id="places-autocomplete-input"
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-24 py-2.5 bg-gray-50 rounded-xl text-sm text-[#1A1A1A] border ${
            error ? "border-rose-400 focus:ring-rose-200" : "border-[#E5E5E2] focus:border-[#10B981] focus:bg-white focus:ring-2 focus:ring-[#10B981]"
          } focus:outline-none transition-all`}
        />
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="absolute right-2 px-2.5 py-1 text-[11px] font-bold text-[#059669] bg-[#F0FDF4] hover:bg-[#DCFCE7] rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-emerald-100"
          title="Use GPS Coordinates"
        >
          <Crosshair className="w-3 h-3" />
          <span>GPS</span>
        </button>
      </div>

      {error && <p className="text-xs text-rose-500 mt-1 font-medium">{error}</p>}

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-[#E5E5E2] py-2 z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-1 text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center justify-between">
            <span>Suggested Locations</span>
            <span className="text-[10px] text-[#059669] font-normal">Auto-coordinates</span>
          </div>

          {filteredSuggestions.map((place, idx) => (
            <button
              key={`${place.address}-${idx}`}
              type="button"
              onClick={() => handleSelect(place)}
              className="w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#F0FDF4] transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-gray-100 group-hover:bg-[#DCFCE7] text-gray-500 group-hover:text-[#059669]">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-[#1A1A1A] group-hover:text-[#059669]">{place.address}</div>
                  <div className="text-[11px] text-gray-400">
                    {place.area} • ({place.lat.toFixed(4)}, {place.lng.toFixed(4)})
                  </div>
                </div>
              </div>
              {Math.abs(lat - place.lat) < 0.001 && Math.abs(lng - place.lng) < 0.001 && (
                <Check className="w-4 h-4 text-[#10B981]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

