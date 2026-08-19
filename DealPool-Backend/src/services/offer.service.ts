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
import { findResourceById } from "../models/resource.model";
import { checkUserHasDebt, getOrCreateWallet, hasOutstandingDebt } from "./wallet.service";
import { findWalletByUserId } from "../models/wallet.model";
import { insertContract } from "../models/contract.model";
import { captureFee, lockEscrow } from "./ledger.service";

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
        const wallet = await findWalletByUserId(requesterId, true, client);
        if (!wallet) throw badRequest("Wallet not found", "WALLET_NOT_FOUND");

        // 2. Debt check on payer
        const payerHasDebt = await hasOutstandingDebt(requesterId, client);
        if (payerHasDebt) {
            throw forbidden("User has outstanding debt. Clear debts before accepting offers.", "DEBT_OUTSTANDING");
        }

        const offer = await findOfferById(offerId, client);
        if (!offer) throw notFound("Offer not found", "OFFER_NOT_FOUND");

        const deal = await findDealById(offer.deal_id, client);
        if (!deal) throw notFound("Deal not found", "DEAL_NOT_FOUND");
        if (deal.user_id !== requesterId) throw forbidden("Not your deal", "FORBIDDEN");

        if (offer.status !== "pending") throw conflict("Offer is not pending", "OFFER_NOT_PENDING");
        if (deal.status !== "open") throw conflict("Deal is not open", "DEAL_NOT_OPEN");

        if (!deal.resource_id) {
            throw badRequest("Deal does not have an associated resource", "INVALID_DEAL");
        }

        const resource = await findResourceById(deal.resource_id, client);
        if (!resource) throw notFound("Resource not found", "RESOURCE_NOT_FOUND");

        const declaredValue = Number(resource.declared_value || 0);
        const depositRate = Number(resource.security_deposit_rate || 0.15);
        const lendFee = offer.price !== undefined && offer.price !== null
            ? Number(offer.price)
            : declaredValue * 0.10;
        const securityAmount = declaredValue * depositRate;
        const platformFee = declaredValue * 0.05;
        const totalRequired = lendFee + securityAmount + platformFee;

        const availableBalance = Number(wallet.balance);
        if (availableBalance < totalRequired) {
            throw badRequest(
                `Insufficient wallet balance. Required: ₹${totalRequired.toFixed(2)} (fee ₹${lendFee.toFixed(2)} + deposit ₹${securityAmount.toFixed(2)} + platform ₹${platformFee.toFixed(2)}), available: ₹${availableBalance.toFixed(2)}`,
                "INSUFFICIENT_BALANCE"
            );
        }

        // 3. Platform fee capture
        if (platformFee > 0) {
            await captureFee(requesterId, platformFee, client);
        }

        // 4. Reject other offers & update statuses
        await rejectOtherOffers(deal.id, offerId, client);
        const acceptedOffer = await updateOfferStatus(offerId, "accepted", client);
        await updateDealStatus(deal.id, "offer_accepted", client);

        // 5. Insert contract row with frozen values
        const contract = await insertContract({
            dealId: deal.id,
            offerId,
            resourceId: deal.resource_id,
            requesterId: deal.user_id,
            providerId: offer.provider_id,
            rentalFee: lendFee,
            securityDeposit: securityAmount,
            declaredValue,
            lendFee,
            securityAmount,
            platformFee,
            securityDepositRate: depositRate,
            status: "created",
        }, client);

        // 6. Insert transaction row for chain tracking
        const parent = await findLatestTransactionForResource(deal.resource_id, client);
        await insertTransaction({
            dealId: deal.id,
            offerId,
            fromUserId: deal.user_id,
            toUserId: offer.provider_id,
            resourceId: deal.resource_id,
            parentTransactionId: parent?.id ?? null,
            declaredValue,
            lendFee,
            securityAmount,
            platformFee,
            securityDepositRate: depositRate,
            status: "agreement_created",
        }, client);

        // 7. Lock escrow (lendFee + securityAmount) against the contract
        await lockEscrow(requesterId, lendFee + securityAmount, contract.id, client);

        // NOTE: updateResourceHolder is NOT called here — custody moves in confirmContract / checkout

        await client.query("COMMIT");
        return acceptedOffer!;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};