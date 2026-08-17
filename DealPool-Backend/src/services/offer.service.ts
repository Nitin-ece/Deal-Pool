import pool from "../config/db";
import {
    insertOffer,
    findOfferById,
    listOffersForDeal,
    updateOfferStatus,
    rejectOtherOffers,
    Offer,
} from "../models/offer.model";
import { getDealById } from "./deal.service";
import { badRequest, notFound, forbidden, conflict } from "../utils/errors";
import { updateDealStatus, findDealById } from "../models/deal.model";
import {
    insertTransaction,
    findLatestTransactionForResource,
} from "../models/transaction.model";
import { updateResourceHolder, findResourceById } from "../models/resource.model";
import { checkUserHasDebt, getOrCreateWallet } from "./wallet.service";
import { findWalletByUserId } from "../models/wallet.model";
import { insertContract } from "../models/contract.model";

interface CreateOfferInput {
    price?: number;
    terms?: string;
}

export const createOffer = async (
    dealId: string,
    providerId: string,
    input: CreateOfferInput
): Promise<Offer> => {
    const hasDebt = await checkUserHasDebt(providerId);
    if (hasDebt) {
        throw forbidden("User has outstanding debt. Settle debts to create offers.", "DEBT_BLOCK");
    }

    const deal = await getDealById(dealId);

    if (deal.status !== "open") {
        throw conflict("Deal is not open for offers", "DEAL_NOT_OPEN");
    }

    if (deal.user_id === providerId) {
        throw badRequest("Cannot offer on your own deal", "CANNOT_OFFER_OWN_DEAL");
    }

    if (deal.resource_id && input.price !== undefined && input.price !== null) {
        const resource = await findResourceById(deal.resource_id);
        if (resource && resource.declared_value !== undefined && resource.declared_value !== null) {
            const declaredVal = Number(resource.declared_value);
            if (declaredVal > 0) {
                const maxCap = declaredVal * 0.10;
                if (input.price > maxCap) {
                    throw badRequest(
                        `Offer price ₹${input.price} exceeds 10% fee cap of declared value ₹${declaredVal} (max ₹${maxCap.toFixed(2)})`,
                        "FEE_EXCEEDS_CAP"
                    );
                }
            }
        }
    }

    return insertOffer({
        dealId,
        providerId,
        price: input.price ?? null,
        terms: input.terms ?? null,
    });
};

export const listOffers = async (dealId: string): Promise<Offer[]> => {
    await getDealById(dealId);
    return listOffersForDeal(dealId);
};

export const withdrawOffer = async (
    offerId: string,
    providerId: string
): Promise<Offer> => {
    const offer = await findOfferById(offerId);

    if (!offer) {
        throw notFound("Offer not found", "OFFER_NOT_FOUND");
    }

    if (offer.provider_id !== providerId) {
        throw forbidden("Not your offer", "FORBIDDEN");
    }

    if (offer.status !== "pending") {
        throw conflict("Offer is not pending", "OFFER_NOT_PENDING");
    }

    const updated = await updateOfferStatus(offerId, "withdrawn");

    return updated!;
};

export const rejectOffer = async (
    offerId: string,
    requesterId: string
): Promise<Offer> => {
    const offer = await findOfferById(offerId);

    if (!offer) {
        throw notFound("Offer not found", "OFFER_NOT_FOUND");
    }

    const deal = await getDealById(offer.deal_id);

    if (deal.user_id !== requesterId) {
        throw forbidden("Not your deal", "FORBIDDEN");
    }

    if (offer.status !== "pending") {
        throw conflict("Offer is not pending", "OFFER_NOT_PENDING");
    }

    const updated = await updateOfferStatus(offerId, "rejected");

    return updated!;
};

export const acceptOffer = async (
    offerId: string,
    requesterId: string
): Promise<Offer> => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Concurrency Guard: Wallet row lock (FOR UPDATE)
        await getOrCreateWallet(requesterId, client);
        await findWalletByUserId(requesterId, true, client);

        const offer = await findOfferById(offerId, client);
        if (!offer) throw notFound("Offer not found", "OFFER_NOT_FOUND");

        const deal = await findDealById(offer.deal_id, client);
        if (!deal) throw notFound("Deal not found", "DEAL_NOT_FOUND");
        if (deal.user_id !== requesterId) throw forbidden("Not your deal", "FORBIDDEN");

        if (offer.status !== "pending") throw conflict("Offer is not pending", "OFFER_NOT_PENDING");
        if (deal.status !== "open") throw conflict("Deal is not open", "DEAL_NOT_OPEN");

        await rejectOtherOffers(deal.id, offerId, client);
        const acceptedOffer = await updateOfferStatus(offerId, "accepted", client);
        await updateDealStatus(deal.id, "offer_accepted", client);

        if (deal.resource_id) {
            const resource = await findResourceById(deal.resource_id, client);
            const parent = await findLatestTransactionForResource(deal.resource_id, client);

            await insertTransaction({
                dealId: deal.id,
                offerId,
                fromUserId: deal.user_id,
                toUserId: offer.provider_id,
                resourceId: deal.resource_id,
                skillId: null,
                parentTransactionId: parent?.id ?? null,
            }, client);

            await updateResourceHolder(deal.resource_id, offer.provider_id, client);

            // Create contract record
            await insertContract({
                dealId: deal.id,
                offerId,
                resourceId: deal.resource_id,
                requesterId: deal.user_id,
                providerId: offer.provider_id,
                rentalFee: Number(offer.price || 0),
                securityDeposit: Number(resource?.declared_value || 0),
                status: "created",
            }, client);
        } else if (deal.skill_id) {
            await insertTransaction({
                dealId: deal.id,
                offerId,
                fromUserId: offer.provider_id,
                toUserId: deal.user_id,
                resourceId: null,
                skillId: deal.skill_id,
                parentTransactionId: null,
            }, client);
        }

        await client.query("COMMIT");
        return acceptedOffer!;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};