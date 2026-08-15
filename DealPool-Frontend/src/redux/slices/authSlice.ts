import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "../../services/api";
import { getErrorMessage } from "../../lib/errors";
import { UserProfile } from "../../types";

interface AuthState {
  user: UserProfile | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  initialized: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  status: "idle",
  initialized: false,
  error: null,
};

export const fetchMe = createAsyncThunk("auth/fetchMe", async (_, { rejectWithValue }) => {
  try {
    const data = await api.get<any, UserProfile>("/api/auth/me");
    return data;
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, "Failed to authenticate session"));
  }
});

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const data = await api.post<any, UserProfile>("/api/auth/login", credentials);
      return data;
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, "Invalid email or password"));
    }
  }
);

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const data = await api.post<any, UserProfile>("/api/auth/register", credentials);
      return data;
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, "Registration failed"));
    }
  }
);

export const loginWithGoogle = createAsyncThunk(
  "auth/loginWithGoogle",
  async (idToken: string, { rejectWithValue }) => {
    try {
      const data = await api.post<any, UserProfile>("/api/auth/google", { idToken });
      return data;
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, "Google sign-in failed"));
    }
  }
);

export const logoutUser = createAsyncThunk("auth/logoutUser", async (_, { rejectWithValue }) => {
  try {
    await api.post("/api/auth/logout");
    return null;
  } catch (err: unknown) {
    return rejectWithValue(getErrorMessage(err, "Logout failed"));
  }
});

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (
    payload: { username?: string; email?: string; profile_photo?: string | null },
    { rejectWithValue }
  ) => {
    try {
      const data = await api.patch<any, UserProfile>("/api/auth/update", payload);
      return data;
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, "Failed to update profile"));
    }
  }
);

export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async (payload: { currentPassword: string; newPassword: string }, { rejectWithValue }) => {
    try {
      await api.patch("/api/auth/change-password", payload);
      return true;
    } catch (err: unknown) {
      return rejectWithValue(getErrorMessage(err, "Failed to change password"));
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    setMockUser: (state, action: PayloadAction<UserProfile>) => {
      state.user = action.payload;
      state.initialized = true;
    },
  },
  extraReducers: (builder) => {
    // fetchMe
    builder
      .addCase(fetchMe.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.initialized = true;
        state.error = null;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.status = "failed";
        state.user = null;
        state.initialized = true;
      });

    // login
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });

    // register
    builder
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });

    // google
    builder
      .addCase(loginWithGoogle.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loginWithGoogle.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });

    // logout
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.status = "idle";
      state.error = null;
    });

    // updateProfile
    builder
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearAuthError, setMockUser } = authSlice.actions;
export default authSlice.reducer;
