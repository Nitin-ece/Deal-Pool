import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { useAuth } from "../../hooks/useAuth";

export function AppLayout() {
  const { checkAuth, initialized } = useAuth();

  useEffect(() => {
    if (!initialized) checkAuth();
  }, [checkAuth, initialized]);

  return (
    <div className="flex min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 pb-20 lg:pb-8">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
