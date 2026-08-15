import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { DiscoveryMarker } from "../slices/mapSlice";

export interface NearbyDiscoveryResponse {
  center: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  needs: DiscoveryMarker[];
  offers: DiscoveryMarker[];
  total: number;
}

export const discoveryApi = createApi({
  reducerPath: "discoveryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/",
  }),
  tagTypes: ["Discovery"],
  endpoints: (builder) => ({
    getNearbyDiscovery: builder.query<
      NearbyDiscoveryResponse,
      { lat: number; lng: number; radiusKm: number }
    >({
      query: ({ lat, lng, radiusKm }) => ({
        url: `/api/discovery/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`,
        method: "GET",
      }),
      transformResponse: (rawResult: any, _meta, arg) => {
        // Support { success: true, data: { ... } } envelope
        const payload = rawResult?.data || rawResult;
        if (payload?.needs && payload?.offers) {
          return payload;
        }

        // If deals array is returned directly from fallback endpoint
        const deals = Array.isArray(payload) ? payload : [];
        const needs: DiscoveryMarker[] = deals
          .filter((d: any) => d.category !== "Offer")
          .map((d: any) => ({
            id: d.id,
            type: "need" as const,
            title: d.title,
            description: d.description,
            category: d.category,
            budgetMin: d.budget_min,
            budgetMax: d.budget_max,
            lat: d.lat,
            lng: d.lng,
            distanceKm: typeof d.distance_km === "number" ? Math.round(d.distance_km * 10) / 10 : 1.2,
            createdAt: d.created_at,
          }));

        const offers: DiscoveryMarker[] = deals
          .filter((d: any) => d.category === "Offer")
          .map((d: any) => ({
            id: d.id,
            type: "offer" as const,
            title: d.title,
            description: d.description,
            category: d.category,
            budgetMin: d.budget_min,
            budgetMax: d.budget_max,
            lat: d.lat,
            lng: d.lng,
            distanceKm: typeof d.distance_km === "number" ? Math.round(d.distance_km * 10) / 10 : 2.0,
            createdAt: d.created_at,
          }));

        return {
          center: {
            lat: arg.lat,
            lng: arg.lng,
            radiusKm: arg.radiusKm,
          },
          needs,
          offers,
          total: needs.length + offers.length,
        };
      },
      providesTags: ["Discovery"],
    }),
  }),
});

export const { useGetNearbyDiscoveryQuery, useLazyGetNearbyDiscoveryQuery } =
  discoveryApi;
