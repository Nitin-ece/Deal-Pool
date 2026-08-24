import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "../../services/api";
import type { WalletSummary } from "../../types/contracts";

export interface LedgerEntry {
  id: string;
  amount: number | string;
  entry_type: string;
  description: string | null;
  created_at: string;
}

interface WalletState {
  summary: WalletSummary | null;
  ledger: LedgerEntry[];
  loading: boolean;
  depositLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  pulseTrigger: number; // Increment to trigger coin counter bounce/glow animation
}

const initialState: WalletState = {
  summary: null,
  ledger: [],
  loading: false,
  depositLoading: false,
  error: null,
  lastUpdated: null,
  pulseTrigger: 0,
};

export const fetchWallet = createAsyncThunk(
  "wallet/fetchWallet",
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.get<any, WalletSummary>("/api/wallet");
      return data;
    } catch (err: any) {
      return rejectWithValue(err?.message || "Failed to load wallet");
    }
  }
);

export const fetchLedger = createAsyncThunk(
  "wallet/fetchLedger",
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.get<any, LedgerEntry[]>("/api/wallet/ledger");
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.message || "Failed to load ledger history");
    }
  }
);

export const depositCoins = createAsyncThunk(
  "wallet/depositCoins",
  async (amount: number, { dispatch, rejectWithValue }) => {
    try {
      const data = await api.post<any, WalletSummary>("/api/wallet/deposit", { amount });
      dispatch(fetchLedger());
      return data;
    } catch (err: any) {
      return rejectWithValue(err?.message || "Deposit failed");
    }
  }
);

export const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    setWalletSummary: (state, action: PayloadAction<WalletSummary>) => {
      state.summary = action.payload;
      state.lastUpdated = Date.now();
      state.pulseTrigger += 1;
    },
    clearWallet: (state) => {
      state.summary = null;
      state.ledger = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchWallet
    builder
      .addCase(fetchWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWallet.fulfilled, (state, action) => {
        state.loading = false;
        if (state.summary && Number(state.summary.balance) !== Number(action.payload.balance)) {
          state.pulseTrigger += 1;
        }
        state.summary = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // fetchLedger
    builder.addCase(fetchLedger.fulfilled, (state, action) => {
      state.ledger = action.payload;
    });

    // depositCoins
    builder
      .addCase(depositCoins.pending, (state) => {
        state.depositLoading = true;
        state.error = null;
      })
      .addCase(depositCoins.fulfilled, (state, action) => {
        state.depositLoading = false;
        state.summary = action.payload;
        state.pulseTrigger += 1;
        state.lastUpdated = Date.now();
      })
      .addCase(depositCoins.rejected, (state, action) => {
        state.depositLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setWalletSummary, clearWallet } = walletSlice.actions;
export default walletSlice.reducer;
