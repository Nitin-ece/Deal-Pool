import {
    insertDeal,
    findDealById,
    listDeals,
    findNearbyDeals,
    updateDealFields,
    deleteDeal,
    Deal,
} from "../models/deal.model";
import { insertResource } from "../models/resource.model";
import { computeDefaultDepositRate } from "./resource.service";
import { badRequest, notFound, forbidden } from "../utils/errors";
import { checkUserHasDebt } from "./wallet.service";

interface CreateDealInput {
    title: string;
    description?: string;
    category?: string;
    budgetMin?: number;
    budgetMax?: number;
    lat: number;
    lng: number;
    radiusKm?: number;
    resourceId?: string;
}

export const createDeal = async (
    userId: string,
    input: CreateDealInput
): Promise<Deal> => {
    const hasDebt = await checkUserHasDebt(userId);
    if (hasDebt) {
        throw forbidden("User has outstanding debt. Settle debts to create deals.", "DEBT_BLOCK");
    }

    if (!input.title || input.lat === undefined || input.lng === undefined) {
        throw badRequest("title, lat, and lng are required", "MISSING_FIELDS");
    }

    let resourceId = input.resourceId ?? null;
    if (!resourceId) {
        const declaredVal = Math.max(Number(input.budgetMax || input.budgetMin || 1000), 100);
        const resource = await insertResource({
            ownerId: userId,
            title: input.title,
            description: input.description ?? null,
            category: input.category ?? null,
            condition: "Good",
            declaredValue: declaredVal,
            securityDepositRate: computeDefaultDepositRate(declaredVal),
            lat: input.lat,
            lng: input.lng,
        });
        resourceId = resource.id;
    }

    return insertDeal({
        userId,
        title: input.title,
        description: input.description ?? null,
        category: input.category ?? null,
        budgetMin: input.budgetMin ?? null,
        budgetMax: input.budgetMax ?? null,
        lat: input.lat,
        lng: input.lng,
        radiusKm: input.radiusKm ?? 10,
        resourceId,
    });
};

export const getDealById = async (id: string): Promise<Deal> => {
    const deal = await findDealById(id);

    if (!deal) {
        throw notFound("Deal not found", "DEAL_NOT_FOUND");
    }

    return deal;
};

export const listAllDeals = async (
    filters: { category?: string; status?: string },
    limit = 50,
    offset = 0
): Promise<Deal[]> => {
    return listDeals(filters, limit, offset);
};

export const listNearbyDeals = async (
    lat: number,
    lng: number,
    radiusKm: number,
    limit = 50,
    offset = 0,
    category?: string
) => {
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
        throw badRequest("lat and lng are required", "MISSING_COORDINATES");
    }

    return findNearbyDeals(lat, lng, radiusKm || 10, limit, offset, category);
};

const UPDATABLE_DEAL_FIELDS = [
    "title",
    "description",
    "category",
    "budget_min",
    "budget_max",
    "radius_km",
    "status",
] as const;

export const updateDeal = async (
    id: string,
    userId: string,
    input: Record<string, unknown>
): Promise<Deal> => {
    const deal = await getDealById(id);

    if (deal.user_id !== userId) {
        throw forbidden("Not your deal", "FORBIDDEN");
    }

    const fields: Record<string, unknown> = {};

    for (const key of UPDATABLE_DEAL_FIELDS) {
        if (input[key] !== undefined) {
            fields[key] = input[key];
        }
    }

    if (Object.keys(fields).length === 0) {
        throw badRequest("No valid fields provided to update", "NO_UPDATE_FIELDS");
    }

    const updated = await updateDealFields(id, fields);

    if (!updated) {
        throw notFound("Deal not found", "DEAL_NOT_FOUND");
    }

    return updated;
};

export const deleteDealById = async (
    id: string,
    userId: string
): Promise<void> => {
    const deal = await getDealById(id);

    if (deal.user_id !== userId) {
        throw forbidden("Not your deal", "FORBIDDEN");
    }

    await deleteDeal(id);
};