import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { LocationPrompt } from "../map/LocationPrompt";
import { useAuth } from "../../hooks/useAuth";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { requestUserLocation } from "../../redux/slices/locationSlice";
import { setUserLocation } from "../../redux/slices/dealsSlice";

export function AppLayout() {
  const dispatch = useAppDispatch();
  const { checkAuth, initialized } = useAuth();
  const locationPermission = useAppSelector((state) => state.location.permission);

  useEffect(() => {
    if (!initialized) checkAuth();
  }, [checkAuth, initialized]);

  // Request browser location automatically on mount
  useEffect(() => {
    if (locationPermission === "prompt") {
      dispatch(requestUserLocation())
        .unwrap()
        .then((res) => dispatch(setUserLocation(res)))
        .catch(() => {});
    }
  }, [dispatch, locationPermission]);

  return (
    <div className="flex min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <Header />
        <LocationPrompt />
        <main className="flex-1 pb-20 lg:pb-8">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
