import { useState, useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux/store";
import { setUserLocation } from "../redux/slices/dealsSlice";

export interface PresetCity {
  name: string;
  lat: number;
  lng: number;
  address: string;
}

export const CITY_PRESETS: PresetCity[] = [
  { name: "New Delhi (CP)", lat: 28.6304, lng: 77.2177, address: "Connaught Place, Central Delhi" },
  { name: "Bengaluru (Indiranagar)", lat: 12.9784, lng: 77.6408, address: "100ft Road, Indiranagar, Bengaluru" },
  { name: "Mumbai (Bandra)", lat: 19.0596, lng: 72.8295, address: "Bandra West, Mumbai" },
  { name: "San Francisco (Mission)", lat: 37.7599, lng: -122.4148, address: "Valencia St, Mission District, SF" },
  { name: "New York (Manhattan)", lat: 40.7128, lng: -74.0060, address: "Broadway & Soho, New York" },
  { name: "London (Soho)", lat: 51.5136, lng: -0.1365, address: "Dean Street, Soho, London" },
];

export function useGeolocation() {
  const dispatch = useAppDispatch();
  const userLocation = useAppSelector((state) => state.deals.userLocation);
  const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "success" | "denied">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);

  const requestBrowserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus("denied");
      setGeoError("Geolocation is not supported by your browser");
      return;
    }

    setGeoStatus("requesting");
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLoc = {
          lat: Math.round(latitude * 10000) / 10000,
          lng: Math.round(longitude * 10000) / 10000,
          address: "Current Geolocation",
          cityName: "Local Area",
        };
        dispatch(setUserLocation(newLoc));
        setGeoStatus("success");
      },
      (err) => {
        setGeoStatus("denied");
        setGeoError(err.message || "Location permission denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [dispatch]);

  const selectPresetCity = useCallback(
    (preset: PresetCity) => {
      dispatch(
        setUserLocation({
          lat: preset.lat,
          lng: preset.lng,
          address: preset.address,
          cityName: preset.name,
        })
      );
      setGeoStatus("success");
    },
    [dispatch]
  );

  return {
    userLocation,
    geoStatus,
    geoError,
    requestBrowserLocation,
    selectPresetCity,
    presets: CITY_PRESETS,
  };
}
