import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import { AppLayout } from "./components/layout/AppLayout";
import { Landing } from "./pages/Landing";
import { DealsMap } from "./pages/DealsMap";
import { DealDetail } from "./pages/DealDetail";
import { CreateDeal } from "./pages/CreateDeal";
import { MyDeals } from "./pages/MyDeals";
import { Settings } from "./pages/Settings";
import { Admin } from "./pages/Admin";
import { Auth } from "./pages/Auth";
import { Contracts } from "./pages/Contracts";

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<Landing />} />

          {/* Standalone Authentication Pages */}
          <Route path="/login" element={<Auth initialMode="login" />} />
          <Route path="/register" element={<Auth initialMode="register" />} />

          {/* Core Applet Routes inside Application Shell */}
          <Route element={<AppLayout />}>
            <Route path="/deals" element={<DealsMap />} />
            <Route path="/browse" element={<DealsMap />} />
            <Route path="/deals/:id" element={<DealDetail />} />
            <Route path="/deals/new" element={<CreateDeal />} />
            <Route path="/create-deal" element={<CreateDeal />} />
            <Route path="/my-deals" element={<MyDeals />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}
