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
import { LocationPermissionGate } from "../components/map/LocationPermissionGate";
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
      {/* Live Interactive Radar / Map Discovery */}
      <LocationPermissionGate heightClass="h-72 sm:h-80 lg:h-96" />

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
