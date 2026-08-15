import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronDown,
  Crosshair,
  MapPin,
  Plus,
  Search,
  Shield,
  Sliders,
  User,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useGeolocation, CITY_PRESETS } from "../../hooks/useGeolocation";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { setSearchQuery, setRadiusKm } from "../../redux/slices/dealsSlice";
import { BrandMark } from "../common/BrandMark";
import { cn } from "../../lib/cn";

export function Header() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isAdmin, logout } = useAuth();
  const { userLocation, selectPresetCity, requestBrowserLocation, geoStatus } = useGeolocation();
  const radiusKm = useAppSelector((state) => state.deals.radiusKm);
  const searchQuery = useAppSelector((state) => state.deals.searchQuery);

  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showRadiusDropdown, setShowRadiusDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

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
            className="w-full truncate rounded-xl border border-[var(--line)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--ink)] focus:bg-white focus:ring-2 focus:ring-[var(--signal)]/25"
          />
        </div>

        <div className="relative hidden sm:block">
          <button
            type="button"
            id="header-location-selector"
            onClick={() => {
              setShowLocationDropdown((v) => !v);
              setShowRadiusDropdown(false);
              setShowUserMenu(false);
            }}
            className="flex max-w-[10rem] items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-2.5 py-2 text-xs font-semibold text-[var(--ink)] transition hover:bg-[var(--surface)] lg:max-w-[12rem]"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--signal)]" />
            <span className="truncate">{userLocation.cityName}</span>
            <ChevronDown className="h-3 w-3 shrink-0 text-[var(--muted)]" />
          </button>
          {showLocationDropdown && (
            <div className="dropdown-panel absolute left-0 mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--line)] bg-white py-2 shadow-lg">
              <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">
                City / region
              </div>
              <button
                type="button"
                onClick={() => {
                  requestBrowserLocation();
                  closeMenus();
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-semibold text-[var(--pool)] transition hover:bg-[var(--surface)]"
              >
                <Crosshair className="h-3.5 w-3.5" />
                {geoStatus === "requesting" ? "Locating…" : "Use current GPS"}
              </button>
              <div className="my-1 border-t border-[var(--line)]" />
              {CITY_PRESETS.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => {
                    selectPresetCity(city);
                    closeMenus();
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition hover:bg-[var(--surface)]",
                    userLocation.cityName === city.name
                      ? "font-bold text-[var(--pool)]"
                      : "font-medium text-[var(--ink)]"
                  )}
                >
                  <span className="truncate">{city.name}</span>
                </button>
              ))}
            </div>
          )}
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
            className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-2.5 py-2 text-xs font-semibold text-[var(--ink)] transition hover:bg-[var(--surface)]"
          >
            <Sliders className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
            <span className="whitespace-nowrap">{radiusKm} km</span>
            <ChevronDown className="h-3 w-3 shrink-0 text-[var(--muted)]" />
          </button>
          {showRadiusDropdown && (
            <div className="dropdown-panel absolute left-0 mt-2 w-40 overflow-hidden rounded-2xl border border-[var(--line)] bg-white py-2 shadow-lg">
              {[3, 5, 8, 15, 25].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    dispatch(setRadiusKm(r));
                    closeMenus();
                  }}
                  className={cn(
                    "flex w-full px-3.5 py-2 text-left text-xs transition hover:bg-[var(--surface)]",
                    radiusKm === r ? "font-bold text-[var(--pool)]" : "font-medium text-[var(--ink)]"
                  )}
                >
                  {r} km
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            to="/deals/new"
            id="header-post-deal-btn"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--signal)] px-3 py-2 text-xs font-bold text-white transition hover:bg-[var(--signal-deep)] sm:px-4"
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
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[var(--line)] bg-[var(--surface)] transition hover:ring-2 hover:ring-[var(--signal)]/35"
              >
                {user.profile_photo ? (
                  <img
                    src={user.profile_photo}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-[var(--pool)]">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
              {showUserMenu && (
                <div className="dropdown-panel absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--line)] bg-white py-2 shadow-lg">
                  <div className="border-b border-[var(--line)] px-4 py-2">
                    <p className="truncate text-xs font-bold text-[var(--ink)]">{user.username}</p>
                    <p className="truncate text-[10px] text-[var(--muted)]">{user.email}</p>
                    {isAdmin && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--pool)]">
                        <Shield className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                  </div>
                  <Link
                    to="/my-deals"
                    onClick={closeMenus}
                    className="block px-4 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)]"
                  >
                    My deals & offers
                  </Link>
                  <Link
                    to="/settings"
                    onClick={closeMenus}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)]"
                  >
                    <User className="h-3.5 w-3.5 text-[var(--muted)]" />
                    Profile & settings
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={closeMenus}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[var(--pool)] hover:bg-[var(--surface)]"
                    >
                      <Shield className="h-3.5 w-3.5" />
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
                      className="w-full px-4 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
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
    </header>
  );
}
