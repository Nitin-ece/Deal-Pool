import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import authReducer from "./slices/authSlice";
import dealsReducer from "./slices/dealsSlice";
import offersReducer from "./slices/offersSlice";
import locationReducer from "./slices/locationSlice";
import mapReducer from "./slices/mapSlice";
import { discoveryApi } from "./services/discoveryApi";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    deals: dealsReducer,
    offers: offersReducer,
    location: locationReducer,
    map: mapReducer,
    [discoveryApi.reducerPath]: discoveryApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(discoveryApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
