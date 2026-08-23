import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "../../services/api";
import { getErrorMessage } from "../../lib/errors";
import { DEFAULT_RADIUS_KM, DEFAULT_LOCATION } from "../../lib/constants";
import { Deal, DealCategory, DealStatus } from "../../types";

interface DealsState {
  nearbyDeals: Deal[];
  allDeals: Deal[];
  currentDeal: Deal | null;
  selectedDealId: string | null;
  hoveredDealId: string | null;
  searchQuery: string;
  selectedCategory: string; // 'All' or specific
  selectedStatus: string; // 'all' or specific
  radiusKm: number;
  userLocation: {
    lat: number;
    lng: number;
    address: string;
    cityName: string;
  };
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: DealsState = {
  nearbyDeals: [],
  allDeals: [],
  currentDeal: null,
  selectedDealId: null,
  hoveredDealId: null,
  searchQuery: "",
  selectedCategory: "All",
  selectedStatus: "all",
  radiusKm: DEFAULT_RADIUS_KM,
  userLocation: {
    lat: DEFAULT_LOCATION.lat,
    lng: DEFAULT_LOCATION.lng,
    address: DEFAULT_LOCATION.address,
    cityName: DEFAULT_LOCATION.cityName,
  },
  loading: false,
  actionLoading: false,
  error: null,
};

export const fetchNearbyDeals = createAsyncThunk(
  "deals/fetchNearbyDeals",
  async (
    params: { lat: number; lng: number; radiusKm: number; category?: string },
    { rejectWithValue }
  ) => {
    try {
      const url = `/api/deals/nearby?lat=${params.lat}&lng=${params.lng}&radiusKm=${params.radiusKm}${
        params.category && params.category !== "All" ? `&category=${encodeURIComponent(params.category)}` : ""
      }`;
      const data = await api.get<any, Deal[]>(url);
      return data;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, "Failed to fetch nearby deals"));
    }
  }
);

export const fetchAllDeals = createAsyncThunk(
  "deals/fetchAllDeals",
  async (params: { category?: string; status?: string; userId?: string } = {}, { rejectWithValue }) => {
    try {
      const queryParts: string[] = [];
      if (params.category && params.category !== "All") queryParts.push(`category=${encodeURIComponent(params.category)}`);
      if (params.status && params.status !== "all") queryParts.push(`status=${encodeURIComponent(params.status)}`);
      if (params.userId) queryParts.push(`userId=${encodeURIComponent(params.userId)}`);
      const url = `/api/deals${queryParts.length ? `?${queryParts.join("&")}` : ""}`;
      const data = await api.get<any, Deal[]>(url);
      return data;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, "Failed to fetch deals"));
    }
  }
);

export const fetchDealById = createAsyncThunk(
  "deals/fetchDealById",
  async (dealId: string, { rejectWithValue }) => {
    try {
      const data = await api.get<any, Deal>(`/api/deals/${dealId}`);
      return data;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, "Failed to fetch deal details"));
    }
  }
);

export const createDeal = createAsyncThunk(
  "deals/createDeal",
  async (
    payload: {
      title: string;
      description: string;
      category: DealCategory;
      budgetMin: number;
      budgetMax: number;
      lat: number;
      lng: number;
      radiusKm: number;
      address?: string;
      image_url?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const data = await api.post<any, Deal>("/api/deals", payload);
      return data;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, "Failed to create deal"));
    }
  }
);

export const updateDeal = createAsyncThunk(
  "deals/updateDeal",
  async (
    {
      id,
      payload,
    }: {
      id: string;
      payload: Partial<{
        title: string;
        description: string;
        category: DealCategory;
        budgetMin: number;
        budgetMax: number;
        status: DealStatus;
        radiusKm: number;
        image_url?: string;
      }>;
    },
    { rejectWithValue }
  ) => {
    try {
      const data = await api.patch<any, Deal>(`/api/deals/${id}`, payload);
      return data;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, "Failed to update deal"));
    }
  }
);

export const deleteDeal = createAsyncThunk(
  "deals/deleteDeal",
  async (dealId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/api/deals/${dealId}`);
      return dealId;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, "Failed to delete deal"));
    }
  }
);

const dealsSlice = createSlice({
  name: "deals",
  initialState,
  reducers: {
    setSelectedDealId: (state, action: PayloadAction<string | null>) => {
      state.selectedDealId = action.payload;
    },
    setHoveredDealId: (state, action: PayloadAction<string | null>) => {
      state.hoveredDealId = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSelectedCategory: (state, action: PayloadAction<string>) => {
      state.selectedCategory = action.payload;
    },
    setSelectedStatus: (state, action: PayloadAction<string>) => {
      state.selectedStatus = action.payload;
    },
    setRadiusKm: (state, action: PayloadAction<number>) => {
      state.radiusKm = action.payload;
    },
    setUserLocation: (
      state,
      action: PayloadAction<{ lat: number; lng: number; address: string; cityName: string }>
    ) => {
      state.userLocation = action.payload;
    },
    clearCurrentDeal: (state) => {
      state.currentDeal = null;
    },
  },
  extraReducers: (builder) => {
    // fetchNearbyDeals
    builder
      .addCase(fetchNearbyDeals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNearbyDeals.fulfilled, (state, action) => {
        state.loading = false;
        state.nearbyDeals = action.payload;
      })
      .addCase(fetchNearbyDeals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // fetchAllDeals
    builder
      .addCase(fetchAllDeals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllDeals.fulfilled, (state, action) => {
        state.loading = false;
        state.allDeals = action.payload;
      })
      .addCase(fetchAllDeals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // fetchDealById
    builder
      .addCase(fetchDealById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDealById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDeal = action.payload;
      })
      .addCase(fetchDealById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // createDeal
    builder
      .addCase(createDeal.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createDeal.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.nearbyDeals.unshift(action.payload);
        state.allDeals.unshift(action.payload);
        state.currentDeal = action.payload;
      })
      .addCase(createDeal.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });

    // deleteDeal
    builder.addCase(deleteDeal.fulfilled, (state, action) => {
      state.nearbyDeals = state.nearbyDeals.filter((d) => d.id !== action.payload);
      state.allDeals = state.allDeals.filter((d) => d.id !== action.payload);
      if (state.currentDeal?.id === action.payload) {
        state.currentDeal = null;
      }
    });
  },
});

export const {
  setSelectedDealId,
  setHoveredDealId,
  setSearchQuery,
  setSelectedCategory,
  setSelectedStatus,
  setRadiusKm,
  setUserLocation,
  clearCurrentDeal,
} = dealsSlice.actions;

export default dealsSlice.reducer;
