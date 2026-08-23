import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { DEFAULT_LOCATION } from "../../lib/constants";

export type LocationPermission = "prompt" | "granted" | "denied" | "loading";

export interface LocationState {
  lat: number;
  lng: number;
  address: string;
  cityName: string;
  permission: LocationPermission;
  fetchedAt: number | null;
  error: string | null;
}

const DEFAULT_COORDS = DEFAULT_LOCATION;

const initialState: LocationState = {
  lat: DEFAULT_COORDS.lat,
  lng: DEFAULT_COORDS.lng,
  address: DEFAULT_COORDS.address,
  cityName: DEFAULT_COORDS.cityName,
  permission: "prompt",
  fetchedAt: null,
  error: null,
};

/**
 * Reverse geocodes coordinates into road name, neighborhood, and city name
 * using Google Maps Geocoder if available, with clean fallback.
 */
async function reverseGeocodeCoords(lat: number, lng: number): Promise<{ address: string; cityName: string }> {
  try {
    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response.results && response.results[0]) {
        const fullAddress = response.results[0].formatted_address;
        const comps = response.results[0].address_components;
        let locality = "";
        for (const comp of comps) {
          if (comp.types.includes("sublocality") || comp.types.includes("neighborhood")) {
            locality = comp.long_name;
            break;
          } else if (comp.types.includes("locality")) {
            locality = comp.long_name;
          }
        }
        return {
          address: fullAddress,
          cityName: locality || fullAddress.split(",")[0] || "Your Area",
        };
      }
    }

    // Fast web reverse-geocoding fallback
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    if (res.ok) {
      const data = await res.json();
      const road = data.address?.road || data.address?.suburb || data.address?.neighbourhood || "";
      const city = data.address?.city || data.address?.state_district || data.address?.town || "Local Area";
      const display = road ? `${road}, ${city}` : data.display_name?.split(",").slice(0, 3).join(",") || `Near ${city}`;
      return {
        address: display,
        cityName: road || city,
      };
    }
  } catch (err) {
    console.debug("Reverse geocode fallback used:", err);
  }

  return {
    address: `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    cityName: "Current Location",
  };
}

/**
 * Snapshot one-time geolocation call using getCurrentPosition.
 * Per specification: Do NOT use watchPosition.
 */
export const requestUserLocation = createAsyncThunk(
  "location/requestUserLocation",
  async (_, { rejectWithValue }) => {
    if (!navigator.geolocation) {
      return rejectWithValue("Geolocation is not supported by your browser");
    }

    return new Promise<{ lat: number; lng: number; address: string; cityName: string }>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = Math.round(position.coords.latitude * 10000) / 10000;
            const lng = Math.round(position.coords.longitude * 10000) / 10000;

            const { address, cityName } = await reverseGeocodeCoords(lat, lng);
            resolve({
              lat,
              lng,
              address,
              cityName,
            });
          },
          (error) => {
            reject(error.message || "Location access denied or unavailable");
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          }
        );
      }
    ).catch((err) => rejectWithValue(String(err)));
  }
);

export const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    setManualLocation: (
      state,
      action: PayloadAction<{ lat: number; lng: number; address: string; cityName?: string }>
    ) => {
      state.lat = action.payload.lat;
      state.lng = action.payload.lng;
      state.address = action.payload.address;
      state.cityName = action.payload.cityName || action.payload.address.split(",")[0] || "Custom Area";
      state.permission = "granted";
      state.fetchedAt = Date.now();
      state.error = null;
    },
    setPermissionStatus: (state, action: PayloadAction<LocationPermission>) => {
      state.permission = action.payload;
    },
    clearLocationError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(requestUserLocation.pending, (state) => {
        state.permission = "loading";
        state.error = null;
      })
      .addCase(requestUserLocation.fulfilled, (state, action) => {
        state.permission = "granted";
        state.lat = action.payload.lat;
        state.lng = action.payload.lng;
        state.address = action.payload.address;
        state.cityName = action.payload.cityName;
        state.fetchedAt = Date.now();
        state.error = null;
      })
      .addCase(requestUserLocation.rejected, (state, action) => {
        state.permission = "denied";
        state.error = (action.payload as string) || "Failed to retrieve location";
      });
  },
});

export const { setManualLocation, setPermissionStatus, clearLocationError } =
  locationSlice.actions;

export default locationSlice.reducer;
