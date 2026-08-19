import {
    insertResource,
    findResourceById,
    listResourcesByOwner,
    findNearbyResources,
    updateResourceFields,
    deleteResource,
    hasActiveDealForResource,
    Resource,
} from "../models/resource.model";
import { badRequest, notFound, forbidden, conflict } from "../utils/errors";

export const computeDefaultDepositRate = (declaredValue: number): number => {
    if (declaredValue <= 500) {
        return 0.15;
    } else if (declaredValue <= 2000) {
        return 0.20;
    } else {
        return 0.25;
    }
};

interface CreateResourceInput {
    title: string;
    description?: string;
    category?: string;
    condition?: string;
    declaredValue?: number;
    securityDepositRate?: number;
    lat: number;
    lng: number;
}

export const createResource = async (
    ownerId: string,
    input: CreateResourceInput
): Promise<Resource> => {
    if (!input.title || input.lat === undefined || input.lng === undefined) {
        throw badRequest("title, lat, and lng are required", "MISSING_FIELDS");
    }

    const declaredVal = Number(input.declaredValue ?? 0);
    if (!declaredVal || isNaN(declaredVal) || declaredVal <= 0) {
        throw badRequest("declaredValue must be a positive number", "INVALID_DECLARED_VALUE");
    }

    let depositRate = input.securityDepositRate;
    if (depositRate === undefined || depositRate === null) {
        depositRate = computeDefaultDepositRate(declaredVal);
    } else {
        depositRate = Number(depositRate);
        if (isNaN(depositRate) || depositRate < 0.10 || depositRate > 0.50) {
            throw badRequest(
                "securityDepositRate must be between 0.10 and 0.50",
                "INVALID_DEPOSIT_RATE"
            );
        }
    }

    return insertResource({
        ownerId,
        title: input.title,
        description: input.description ?? null,
        category: input.category ?? null,
        condition: input.condition ?? null,
        declaredValue: declaredVal,
        securityDepositRate: depositRate,
        lat: input.lat,
        lng: input.lng,
    });
};

export const getResourceById = async (id: string): Promise<Resource> => {
    const resource = await findResourceById(id);
    if (!resource) throw notFound("Resource not found", "RESOURCE_NOT_FOUND");
    return resource;
};

export const listMyResources = async (ownerId: string): Promise<Resource[]> => {
    return listResourcesByOwner(ownerId);
};

export const listNearbyResources = async (
    lat: number,
    lng: number,
    radiusKm: number,
    limit = 50,
    offset = 0
) => {
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
        throw badRequest("lat and lng are required", "MISSING_COORDINATES");
    }
    return findNearbyResources(lat, lng, radiusKm || 10, limit, offset);
};

const UPDATABLE_RESOURCE_FIELDS = [
    "title",
    "description",
    "category",
    "condition",
    "declared_value",
    "declaredValue",
    "security_deposit_rate",
    "securityDepositRate",
    "is_available",
] as const;

export const updateResource = async (
    id: string,
    userId: string,
    input: Record<string, unknown>
): Promise<Resource> => {
    const resource = await getResourceById(id);
    if (resource.owner_id !== userId) {
        throw forbidden("Not your resource", "FORBIDDEN");
    }

    const isChangingValue =
        input.declared_value !== undefined ||
        input.declaredValue !== undefined ||
        input.security_deposit_rate !== undefined ||
        input.securityDepositRate !== undefined;

    if (isChangingValue) {
        const hasActive = await hasActiveDealForResource(id);
        if (hasActive) {
            throw conflict("Cannot change value while a deal is active", "VALUE_LOCKED");
        }
    }

    const fields: Record<string, unknown> = {};
    for (const key of UPDATABLE_RESOURCE_FIELDS) {
        if (input[key] !== undefined) {
            if (key === "declaredValue") {
                fields["declared_value"] = input[key];
            } else if (key === "securityDepositRate") {
                fields["security_deposit_rate"] = input[key];
            } else {
                fields[key] = input[key];
            }
        }
    }

    if (Object.keys(fields).length === 0) {
        throw badRequest("No valid fields provided to update", "NO_UPDATE_FIELDS");
    }

    const updated = await updateResourceFields(id, fields);
    if (!updated) throw notFound("Resource not found", "RESOURCE_NOT_FOUND");
    return updated;
};

export const deleteResourceById = async (id: string, userId: string): Promise<void> => {
    const resource = await getResourceById(id);
    if (resource.owner_id !== userId) {
        throw forbidden("Not your resource", "FORBIDDEN");
    }
    await deleteResource(id);
};