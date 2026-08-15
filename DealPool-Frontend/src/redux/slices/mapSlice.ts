import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface DiscoveryMarker {
  id: string;
  type: "self" | "need" | "offer";
  title: string;
  description?: string;
  category?: string;
  budgetMin?: number;
  budgetMax?: number;
  lat: number;
  lng: number;
  distanceKm?: number;
  createdAt?: string;
}

export interface MapState {
  radiusKm: number;
  selectedMarker: DiscoveryMarker | null;
  hoveredMarkerId: string | null;
  activeFilter: "all" | "needs" | "offers";
  zoom: number;
}

const initialState: MapState = {
  radiusKm: 5,
  selectedMarker: null,
  hoveredMarkerId: null,
  activeFilter: "all",
  zoom: 13,
};

export const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setRadiusKm: (state, action: PayloadAction<number>) => {
      state.radiusKm = action.payload;
    },
    setSelectedMarker: (state, action: PayloadAction<DiscoveryMarker | null>) => {
      state.selectedMarker = action.payload;
    },
    setHoveredMarkerId: (state, action: PayloadAction<string | null>) => {
      state.hoveredMarkerId = action.payload;
    },
    setActiveFilter: (state, action: PayloadAction<"all" | "needs" | "offers">) => {
      state.activeFilter = action.payload;
    },
    setZoom: (state, action: PayloadAction<number>) => {
      state.zoom = action.payload;
    },
  },
});

export const {
  setRadiusKm,
  setSelectedMarker,
  setHoveredMarkerId,
  setActiveFilter,
  setZoom,
} = mapSlice.actions;

export default mapSlice.reducer;
