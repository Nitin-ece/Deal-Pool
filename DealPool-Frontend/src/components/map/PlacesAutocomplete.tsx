import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Crosshair, Check, AlertTriangle } from "lucide-react";
import { DEFAULT_LOCATION } from "../../lib/constants";

interface PlaceSuggestion {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
}

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
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [mapsAvailable, setMapsAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Initialize Google Maps services when available
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google?.maps?.places?.AutocompleteService && window.google?.maps?.Geocoder) {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        geocoderRef.current = new window.google.maps.Geocoder();
        setMapsAvailable(true);
        return true;
      }
      return false;
    };

    if (!checkGoogleMaps()) {
      // Retry a few times in case the script loads after this component mounts
      const interval = setInterval(() => {
        if (checkGoogleMaps()) clearInterval(interval);
      }, 1000);
      const timeout = setTimeout(() => clearInterval(interval), 10000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, []);

  // Fetch autocomplete suggestions from Google Places API
  const fetchSuggestions = useCallback(
    (query: string) => {
      if (!autocompleteServiceRef.current || !query.trim()) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: query,
          types: ["geocode", "establishment"],
        },
        (predictions, status) => {
          setLoading(false);
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            setSuggestions(
              predictions.slice(0, 6).map((p) => ({
                address: p.description,
                lat: 0, // Resolved on selection via geocoder
                lng: 0,
                placeId: p.place_id,
              }))
            );
          } else {
            setSuggestions([]);
          }
        }
      );
    },
    []
  );

  // Debounced input handler
  useEffect(() => {
    if (!inputValue.trim() || !mapsAvailable) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(inputValue), 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, mapsAvailable, fetchSuggestions]);

  // Click-outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (place: PlaceSuggestion) => {
    setInputValue(place.address);
    setIsOpen(false);

    // If we already have resolved coords (e.g. from GPS), use them directly
    if (place.lat !== 0 && place.lng !== 0) {
      onChange({
        address: place.address,
        lat: Math.round(place.lat * 10000) / 10000,
        lng: Math.round(place.lng * 10000) / 10000,
      });
      return;
    }

    // Geocode the placeId to get actual coordinates
    if (geocoderRef.current && place.placeId) {
      try {
        const result = await geocoderRef.current.geocode({ placeId: place.placeId });
        if (result.results[0]?.geometry?.location) {
          const loc = result.results[0].geometry.location;
          onChange({
            address: place.address,
            lat: Math.round(loc.lat() * 10000) / 10000,
            lng: Math.round(loc.lng() * 10000) / 10000,
          });
          return;
        }
      } catch (err) {
        console.warn("Geocoding failed for placeId:", place.placeId, err);
      }
    }

    // Fallback: use current lat/lng if geocoding fails
    onChange({ address: place.address, lat, lng });
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

      {!mapsAvailable && isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-amber-50 rounded-xl border border-amber-200 p-4 z-50">
          <div className="flex items-center gap-2 text-xs text-amber-700 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Address search unavailable — use GPS or enter coordinates manually.</span>
          </div>
        </div>
      )}

      {mapsAvailable && isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-[#E5E5E2] py-2 z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-1 text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center justify-between">
            <span>{loading ? "Searching..." : "Suggested Locations"}</span>
            <span className="text-[10px] text-[#059669] font-normal">Google Places</span>
          </div>

          {suggestions.map((place, idx) => (
            <button
              key={`${place.placeId || place.address}-${idx}`}
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
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
