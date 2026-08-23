import { Request, Response, NextFunction } from "express";
import { listNearbyDeals } from "../services/deal.service";
import type { ApiResponse } from "../utils/responseApi";

export const getNearbyDiscoveryHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const lat = Number(req.query.lat);
        const lng = Number(req.query.lng);
        const radiusKm = Number(req.query.radiusKm) || 10;
        const limit = Number(req.query.limit) || 50;
        const offset = Number(req.query.offset) || 0;

        let deals: any[] = [];
        try {
            deals = await listNearbyDeals(lat, lng, radiusKm, limit, offset);
        } catch {
            deals = [];
        }

        // Separate needs (no pending/accepted offers) and offers (have pending/accepted offers)
        const needs = deals
            .filter((d) => !d.has_offers)
            .map((d) => {
                const distanceKm = typeof d.distance_km === "number" 
                    ? Math.round(d.distance_km * 10) / 10 
                    : 1.2;
                return {
                    id: d.id,
                    type: "need" as const,
                    title: d.title,
                    description: d.description,
                    category: d.category,
                    budgetMin: d.budget_min,
                    budgetMax: d.budget_max,
                    lat: d.lat,
                    lng: d.lng,
                    distanceKm,
                    createdAt: d.created_at,
                };
            });

        const offers = deals
            .filter((d) => d.has_offers)
            .map((d) => {
                const distanceKm = typeof d.distance_km === "number" 
                    ? Math.round(d.distance_km * 10) / 10 
                    : 1.8;
                return {
                    id: d.id,
                    type: "offer" as const,
                    title: d.title,
                    description: d.description,
                    category: d.category,
                    budgetMin: d.budget_min,
                    budgetMax: d.budget_max,
                    lat: d.lat,
                    lng: d.lng,
                    distanceKm,
                    createdAt: d.created_at,
                };
            });

        const response: ApiResponse<{
            center: { lat: number; lng: number; radiusKm: number };
            needs: typeof needs;
            offers: typeof offers;
            total: number;
        }> = {
            success: true,
            data: {
                center: { lat, lng, radiusKm },
                needs,
                offers,
                total: needs.length + offers.length,
            },
        };

        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};
