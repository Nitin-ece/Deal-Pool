import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";
import { getErrorMessage } from "../../lib/errors";
import { Offer } from "../../types";

interface OffersState {
  offersByDeal: Record<string, Offer[]>;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: OffersState = {
  offersByDeal: {},
  loading: false,
  actionLoading: false,
  error: null,
};

export const fetchOffersForDeal = createAsyncThunk(
  "offers/fetchOffersForDeal",
  async (dealId: string, { rejectWithValue }) => {
    try {
      const data = await api.get<any, Offer[]>(`/api/deals/${dealId}/offers`);
      return { dealId, offers: data };
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, "Failed to fetch offers"));
    }
  }
);

export const createOffer = createAsyncThunk(
  "offers/createOffer",
  async (
    { dealId, price, terms }: { dealId: string; price: number; terms: string },
    { rejectWithValue }
  ) => {
    try {
      const data = await api.post<any, Offer>(`/api/deals/${dealId}/offers`, { price, terms });
      return data;
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, "Failed to submit offer"));
    }
  }
);

export const acceptOffer = createAsyncThunk(
  "offers/acceptOffer",
  async (offerId: string, { rejectWithValue }) => {
    try {
      const data = await api.patch<any, Offer>(`/api/offers/${offerId}/accept`);
      return data;
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, "Failed to accept offer"));
    }
  }
);

export const rejectOffer = createAsyncThunk(
  "offers/rejectOffer",
  async (offerId: string, { rejectWithValue }) => {
    try {
      const data = await api.patch<any, Offer>(`/api/offers/${offerId}/reject`);
      return data;
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, "Failed to reject offer"));
    }
  }
);

export const withdrawOffer = createAsyncThunk(
  "offers/withdrawOffer",
  async (offerId: string, { rejectWithValue }) => {
    try {
      const data = await api.patch<any, Offer>(`/api/offers/${offerId}/withdraw`);
      return data;
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, "Failed to withdraw offer"));
    }
  }
);

const offersSlice = createSlice({
  name: "offers",
  initialState,
  reducers: {
    clearOffersError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchOffersForDeal
    builder
      .addCase(fetchOffersForDeal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOffersForDeal.fulfilled, (state, action) => {
        state.loading = false;
        state.offersByDeal[action.payload.dealId] = action.payload.offers;
      })
      .addCase(fetchOffersForDeal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // createOffer
    builder
      .addCase(createOffer.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createOffer.fulfilled, (state, action) => {
        state.actionLoading = false;
        const dealId = action.payload.deal_id;
        if (!state.offersByDeal[dealId]) {
          state.offersByDeal[dealId] = [];
        }
        state.offersByDeal[dealId].unshift(action.payload);
      })
      .addCase(createOffer.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });

    // acceptOffer
    builder.addCase(acceptOffer.fulfilled, (state, action) => {
      const updatedOffer = action.payload;
      const dealId = updatedOffer.deal_id;
      if (state.offersByDeal[dealId]) {
        state.offersByDeal[dealId] = state.offersByDeal[dealId].map((off) => {
          if (off.id === updatedOffer.id) {
            return updatedOffer;
          }
          // competing offers become rejected
          if (off.status === "pending") {
            return { ...off, status: "rejected" };
          }
          return off;
        });
      }
    });

    // rejectOffer
    builder.addCase(rejectOffer.fulfilled, (state, action) => {
      const updatedOffer = action.payload;
      const dealId = updatedOffer.deal_id;
      if (state.offersByDeal[dealId]) {
        state.offersByDeal[dealId] = state.offersByDeal[dealId].map((off) =>
          off.id === updatedOffer.id ? updatedOffer : off
        );
      }
    });

    // withdrawOffer
    builder.addCase(withdrawOffer.fulfilled, (state, action) => {
      const updatedOffer = action.payload;
      const dealId = updatedOffer.deal_id;
      if (state.offersByDeal[dealId]) {
        state.offersByDeal[dealId] = state.offersByDeal[dealId].map((off) =>
          off.id === updatedOffer.id ? updatedOffer : off
        );
      }
    });
  },
});

export const { clearOffersError } = offersSlice.actions;
export default offersSlice.reducer;
