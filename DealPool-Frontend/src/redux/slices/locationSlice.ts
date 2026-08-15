import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

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

const DEFAULT_COORDS = {
  lat: 28.6304,
  lng: 77.2177,
  address: "Connaught Place, New Delhi",
  cityName: "New Delhi",
};

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
          (position) => {
            const lat = Math.round(position.coords.latitude * 10000) / 10000;
            const lng = Math.round(position.coords.longitude * 10000) / 10000;
            resolve({
              lat,
              lng,
              address: `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
              cityName: "Current Location",
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
