import { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../redux/store";
import { setUserLocation } from "../redux/slices/dealsSlice";
import { setManualLocation, requestUserLocation as requestSliceLocation } from "../redux/slices/locationSlice";

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
  const locationState = useAppSelector((state) => state.location);
  const dealsLocation = useAppSelector((state) => state.deals.userLocation);

  const activeLocation = {
    lat: locationState.lat || dealsLocation.lat,
    lng: locationState.lng || dealsLocation.lng,
    address: locationState.address || dealsLocation.address,
    cityName: locationState.cityName || dealsLocation.cityName,
  };

  const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "success" | "denied">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);

  const requestBrowserLocation = useCallback(() => {
    setGeoStatus("requesting");
    dispatch(requestSliceLocation())
      .unwrap()
      .then((res) => {
        dispatch(setUserLocation(res));
        setGeoStatus("success");
      })
      .catch((err) => {
        setGeoStatus("denied");
        setGeoError(String(err));
      });
  }, [dispatch]);

  const selectPresetCity = useCallback(
    (preset: PresetCity) => {
      const payload = {
        lat: preset.lat,
        lng: preset.lng,
        address: preset.address,
        cityName: preset.name,
      };
      dispatch(setManualLocation(payload));
      dispatch(setUserLocation(payload));
      setGeoStatus("success");
    },
    [dispatch]
  );

  return {
    userLocation: activeLocation,
    geoStatus,
    geoError,
    requestBrowserLocation,
    selectPresetCity,
    presets: CITY_PRESETS,
  };
}

export default useGeolocation;
