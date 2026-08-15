import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Compass,
  Crosshair,
  Plus,
  Radio,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../redux/store";
import {
  fetchNearbyDeals,
  setHoveredDealId,
  setRadiusKm,
} from "../redux/slices/dealsSlice";
import { DealCard } from "../components/deals/DealCard";
import { DealFilters } from "../components/deals/DealFilters";
import { DealCardSkeleton } from "../components/common/LoadingSkeleton";
import { ApiUnavailable } from "../components/common/ApiUnavailable";
import { OffersPanel } from "../components/offers/OffersPanel";
import { useGeolocation, CITY_PRESETS } from "../hooks/useGeolocation";
import { Deal } from "../types";
import { cn } from "../lib/cn";

export function DealsMap() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { userLocation, selectPresetCity, requestBrowserLocation, geoStatus } = useGeolocation();

  const {
    nearbyDeals,
    loading,
    error,
    radiusKm,
    selectedCategory,
    searchQuery,
    selectedStatus,
    selectedDealId,
    hoveredDealId,
  } = useAppSelector((state) => state.deals);

  const [sortBy, setSortBy] = useState<"distance" | "newest" | "budget_low" | "budget_high">(
    "distance"
  );
  const [activeOfferDeal, setActiveOfferDeal] = useState<Deal | null>(null);
  const [isOffersPanelOpen, setIsOffersPanelOpen] = useState(false);

  const refetch = () =>
    dispatch(
      fetchNearbyDeals({
        lat: userLocation.lat,
        lng: userLocation.lng,
        radiusKm,
        category: selectedCategory,
      })
    );

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, userLocation.lat, userLocation.lng, radiusKm, selectedCategory]);

  const filteredDeals = nearbyDeals
    .filter((deal) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !deal.title.toLowerCase().includes(q) &&
          !deal.description.toLowerCase().includes(q) &&
          !deal.category.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (selectedStatus !== "all" && deal.status !== selectedStatus) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "distance") return (a.distance_km || 0) - (b.distance_km || 0);
      if (sortBy === "newest")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "budget_low") return a.budget_min - b.budget_min;
      if (sortBy === "budget_high") return b.budget_max - a.budget_max;
      return 0;
    });

  const backendGap =
    Boolean(error) &&
    (error!.toLowerCase().includes("not available") ||
      error!.toLowerCase().includes("not found") ||
      error!.toLowerCase().includes("cannot reach"));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--ink)]">
        <div className="relative h-56 w-full overflow-hidden sm:h-64 lg:h-72">
          <img
            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1600&q=80"
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full scale-105 object-cover opacity-55 contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/55 to-black/35" />

          <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
            <div className="h-40 w-40 rounded-full border border-[var(--signal)]/30 animate-radar-pulse sm:h-56 sm:w-56" />
            <div className="absolute h-24 w-24 rounded-full border border-white/25 sm:h-36 sm:w-36" />
            <div className="absolute h-3 w-3 rounded-full bg-[var(--signal)] ring-4 ring-[var(--signal)]/30" />
          </div>

          <div className="absolute left-5 right-5 top-5 z-10 max-w-xl space-y-2 text-white sm:left-6">
            <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs font-bold text-[var(--signal)] backdrop-blur-md">
              <Radio className="h-3.5 w-3.5 shrink-0 animate-pulse" />
              <span className="truncate">Live radar · {userLocation.cityName}</span>
              <span className="text-white/35">·</span>
              <span className="text-white/90">{radiusKm} km</span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Neighborhood need radar
            </h1>
            <p className="max-w-md text-xs leading-relaxed text-white/70 sm:text-sm">
              Active needs and skill requests from neighbors in range.
            </p>
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => requestBrowserLocation()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/25"
              >
                <Crosshair className="h-3.5 w-3.5 text-[var(--signal)]" />
                {geoStatus === "requesting" ? "Locating…" : "My GPS"}
              </button>
              {CITY_PRESETS.slice(0, 4).map((city) => (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => selectPresetCity(city)}
                  className={cn(
                    "shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold backdrop-blur-md transition",
                    userLocation.cityName === city.name
                      ? "bg-[var(--signal)] text-white"
                      : "border border-white/10 bg-black/45 text-white/90 hover:bg-black/60"
                  )}
                >
                  {city.name}
                </button>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-black/55 p-1 backdrop-blur-md">
              {[3, 5, 8, 15, 25].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => dispatch(setRadiusKm(r))}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-bold transition",
                    radiusKm === r ? "bg-[var(--signal)] text-white" : "text-white/70 hover:text-white"
                  )}
                >
                  {r}km
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Needs in radar", value: String(filteredDeals.length) },
          { label: "Sector", value: userLocation.cityName },
          { label: "Radius", value: `${radiusKm} km` },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[var(--line)] bg-white p-4"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              {stat.label}
            </p>
            <p className="mt-1 truncate font-display text-xl font-bold text-[var(--ink)]">
              {stat.value}
            </p>
          </div>
        ))}
        <Link
          to="/deals/new"
          className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white p-4 transition hover:border-[var(--ink)]"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              Need something?
            </p>
            <p className="mt-1 text-xs font-bold text-[var(--pool)]">Broadcast to area</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--signal)] text-white">
            <Plus className="h-5 w-5" />
          </span>
        </Link>
      </div>

      <div className="space-y-4">
        <DealFilters />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-[var(--muted)]">
            Showing{" "}
            <strong className="text-[var(--ink)]">{filteredDeals.length}</strong> requests within{" "}
            <strong className="text-[var(--ink)]">{radiusKm} km</strong>
          </p>
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            Sort
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold normal-case tracking-normal text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--signal)]/30"
            >
              <option value="distance">Nearest first</option>
              <option value="newest">Newest posted</option>
              <option value="budget_low">Budget: low → high</option>
              <option value="budget_high">Budget: high → low</option>
            </select>
          </label>
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-5 pt-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <DealCardSkeleton key={idx} />
            ))}
          </div>
        )}

        {!loading && error && backendGap && (
          <ApiUnavailable
            onRetry={() => {
              void refetch();
            }}
            message={error}
          />
        )}

        {!loading && error && !backendGap && (
          <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
            <p className="break-words text-sm font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filteredDeals.length === 0 && (
          <div className="space-y-4 rounded-3xl border border-[var(--line)] bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--paper)] text-[var(--pool)]">
              <Compass className="h-7 w-7" />
            </div>
            <div className="mx-auto max-w-md space-y-1">
              <h3 className="font-display text-base font-bold text-[var(--ink)]">
                No needs in this radar
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Expand the radius or post the first request in your neighborhood.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => dispatch(setRadiusKm(25))}
                className="rounded-xl bg-[var(--paper)] px-4 py-2 text-xs font-bold text-[var(--ink)] transition hover:bg-[var(--line)]"
              >
                Expand to 25 km
              </button>
              <Link
                to="/deals/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--signal)] px-5 py-2 text-xs font-bold text-white transition hover:bg-[var(--signal-deep)]"
              >
                <Plus className="h-4 w-4" />
                Post a need
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && filteredDeals.length > 0 && (
          <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                isSelected={selectedDealId === deal.id}
                isHovered={hoveredDealId === deal.id}
                onSelect={(id) => navigate(`/deals/${id}`)}
                onHover={(id) => dispatch(setHoveredDealId(id))}
                onOpenOffer={(d) => {
                  setActiveOfferDeal(d);
                  setIsOffersPanelOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <OffersPanel
        deal={activeOfferDeal}
        isOpen={isOffersPanelOpen}
        onClose={() => {
          setIsOffersPanelOpen(false);
          setActiveOfferDeal(null);
        }}
      />
    </div>
  );
}
