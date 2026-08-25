import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronDown,
  Coins,
  Crosshair,
  MapPin,
  Moon,
  Plus,
  Search,
  Shield,
  Sliders,
  Sun,
  User,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useGeolocation } from "../../hooks/useGeolocation";
import { useTheme } from "../../hooks/useTheme";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { setSearchQuery, setRadiusKm } from "../../redux/slices/dealsSlice";
import { BrandMark } from "../common/BrandMark";
import { cn } from "../../lib/cn";
import { WalletModal } from "../wallet/WalletModal";
import { fetchWallet } from "../../redux/slices/walletSlice";

export function Header() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { userLocation, requestBrowserLocation, geoStatus } = useGeolocation();
  const radiusKm = useAppSelector((state) => state.deals.radiusKm);
  const searchQuery = useAppSelector((state) => state.deals.searchQuery);
  const wallet = useAppSelector((state) => state.wallet.summary);
  const pulseTrigger = useAppSelector((state) => state.wallet.pulseTrigger);

  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showRadiusDropdown, setShowRadiusDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (user) {
      dispatch(fetchWallet());
    }
  }, [user, dispatch]);

  useEffect(() => {
    if (pulseTrigger > 0) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [pulseTrigger]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) {
        setShowLocationDropdown(false);
        setShowRadiusDropdown(false);
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const closeMenus = () => {
    setShowLocationDropdown(false);
    setShowRadiusDropdown(false);
    setShowUserMenu(false);
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-20 border-b border-[var(--line)] bg-white/95 backdrop-blur-md"
    >
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:h-[4.5rem] lg:px-8">
        <div className="lg:hidden">
          <BrandMark size="sm" />
        </div>

        <div className="relative min-w-0 flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            id="header-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            placeholder="Search needs…"
            className="w-full truncate rounded-xl border border-[var(--line)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--signal)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--signal)]/25"
          />
        </div>

        <div className="relative hidden sm:block">
          <button
            type="button"
            id="header-location-selector"
            onClick={() => requestBrowserLocation()}
            disabled={geoStatus === "requesting"}
            className="flex max-w-[10rem] items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2.5 py-2 text-xs font-semibold text-[var(--ink)] transition hover:bg-[var(--paper)] lg:max-w-[14rem] cursor-pointer shadow-xs"
            title={userLocation.cityName ? `Current Location: ${userLocation.cityName}` : "Click to enable current location"}
          >
            <MapPin className={cn("h-3.5 w-3.5 shrink-0", userLocation.cityName ? "text-[var(--signal)]" : "text-[var(--muted)]")} />
            <span className="truncate">
              {geoStatus === "requesting"
                ? "Locating…"
                : userLocation.cityName || "Enable Location"}
            </span>
            {userLocation.cityName && (
              <span className="flex h-2 w-2 shrink-0">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </button>
        </div>

        <div className="relative hidden md:block">
          <button
            type="button"
            id="header-radius-selector"
            onClick={() => {
              setShowRadiusDropdown((v) => !v);
              setShowLocationDropdown(false);
              setShowUserMenu(false);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2.5 py-2 text-xs font-semibold text-[var(--ink)] transition hover:bg-[var(--paper)] cursor-pointer shadow-xs"
          >
            <Sliders className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
            <span className="whitespace-nowrap">{radiusKm} km</span>
            <ChevronDown className="h-3 w-3 shrink-0 text-[var(--muted)]" />
          </button>
          {showRadiusDropdown && (
            <div className="dropdown-panel absolute left-0 mt-2 w-40 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-2 shadow-xl z-50">
              {[3, 5, 8, 15, 25].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    dispatch(setRadiusKm(r));
                    closeMenus();
                  }}
                  className={cn(
                    "flex w-full px-3.5 py-2 text-left text-xs transition hover:bg-[var(--paper)] cursor-pointer",
                    radiusKm === r ? "font-bold text-[var(--signal)]" : "font-medium text-[var(--ink)]"
                  )}
                >
                  {r} km
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            id="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] transition-all hover:bg-[var(--line)]/40 hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
            title={`Switch to ${isDark ? "Bright Mode" : "Dark Mode"}`}
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400 animate-in spin-in-180 duration-300" />
            ) : (
              <Moon className="h-4 w-4 text-[var(--ink)] animate-in spin-in-180 duration-300" />
            )}
          </button>

          {user && (
            <button
              type="button"
              id="header-wallet-btn"
              onClick={() => setShowWalletModal(true)}
              className={cn(
                "group relative flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--ink)] transition-all duration-300 hover:border-emerald-500 hover:shadow-xs cursor-pointer",
                isPulsing && "ring-2 ring-emerald-400 bg-emerald-500/10 scale-105"
              )}
            >
              <Coins className={cn("h-4 w-4 text-amber-500 transition-transform group-hover:scale-110", isPulsing && "animate-bounce text-emerald-400")} />
              <span className="font-extrabold text-[var(--ink)]">₹{Math.round(Number(wallet?.balance ?? 0)).toLocaleString("en-IN")}</span>
              <span className="text-[10px] text-[var(--muted)] font-normal hidden sm:inline">coins</span>
              {isPulsing && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </button>
          )}

          <Link
            to="/deals/new"
            id="header-post-deal-btn"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--signal)] px-3 py-2 text-xs font-bold text-white transition hover:bg-[var(--signal-deep)] hover:scale-102 active:scale-98 sm:px-4 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Post a need</span>
          </Link>

          {user ? (
            <div className="relative">
              <button
                type="button"
                id="header-user-avatar"
                onClick={() => {
                  setShowUserMenu((v) => !v);
                  setShowLocationDropdown(false);
                  setShowRadiusDropdown(false);
                }}
                className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 transition hover:bg-[var(--paper)] cursor-pointer"
              >
                {user.profile_photo ? (
                  <img
                    src={user.profile_photo}
                    alt=""
                    className="h-7 w-7 rounded-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface)] text-xs font-bold text-[var(--pool)]">
                    {user.username.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <ChevronDown className="mr-1 h-3.5 w-3.5 text-[var(--muted)]" />
              </button>
              {showUserMenu && (
                <div className="dropdown-panel absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-2 shadow-xl z-50">
                  <div className="border-b border-[var(--line)] px-4 py-2">
                    <p className="truncate text-xs font-bold text-[var(--ink)]">{user.username}</p>
                    <p className="truncate text-[10px] text-[var(--muted)]">{user.email}</p>
                    {isAdmin && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                        <Shield className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenus();
                      setShowWalletModal(true);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper)] text-left cursor-pointer"
                  >
                    <Coins className="h-3.5 w-3.5 text-[var(--signal)]" />
                    My Wallet & Coins
                  </button>
                  <Link
                    to="/contracts"
                    onClick={closeMenus}
                    className="block px-4 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper)]"
                  >
                    Contracts & escrow
                  </Link>
                  <Link
                    to="/my-deals"
                    onClick={closeMenus}
                    className="block px-4 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper)]"
                  >
                    My deals & offers
                  </Link>
                  <Link
                    to="/settings"
                    onClick={closeMenus}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper)]"
                  >
                    <User className="h-3.5 w-3.5 text-[var(--muted)]" />
                    Profile & settings
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={closeMenus}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-emerald-500 hover:bg-[var(--paper)]"
                    >
                      <Shield className="h-3.5 w-3" />
                      Admin panel
                    </Link>
                  )}
                  <div className="mt-1 border-t border-[var(--line)] pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        closeMenus();
                        try {
                          await logout().unwrap();
                          toast.success("Signed out");
                          navigate("/");
                        } catch {
                          toast.error("Could not sign out cleanly");
                          navigate("/");
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-xl px-3 py-2 text-xs font-bold text-[var(--ink)] transition hover:bg-[var(--surface)]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </header>
  );
}
