import { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../redux/store";
import { setUserLocation } from "../redux/slices/dealsSlice";
import { requestUserLocation as requestSliceLocation } from "../redux/slices/locationSlice";

export function useGeolocation() {
  const dispatch = useAppDispatch();
  const locationState = useAppSelector((state) => state.location);
  const dealsLocation = useAppSelector((state) => state.deals.userLocation);

  const activeLocation = {
    lat: locationState.lat || dealsLocation?.lat || 0,
    lng: locationState.lng || dealsLocation?.lng || 0,
    address: locationState.address || dealsLocation?.address || "",
    cityName: locationState.cityName || dealsLocation?.cityName || "",
  };

  const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "success" | "denied">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);

  const requestBrowserLocation = useCallback(() => {
    setGeoStatus("requesting");
    return dispatch(requestSliceLocation())
      .unwrap()
      .then((res) => {
        dispatch(setUserLocation(res));
        setGeoStatus("success");
        return res;
      })
      .catch((err) => {
        setGeoStatus("denied");
        setGeoError(String(err));
        throw err;
      });
  }, [dispatch]);

  return {
    userLocation: activeLocation,
    hasLocation: Boolean(activeLocation.lat && activeLocation.lng),
    geoStatus,
    geoError,
    requestBrowserLocation,
  };
}

export default useGeolocation;
