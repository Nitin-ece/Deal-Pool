import dotenv from "dotenv";
import path from "path";
import request from "supertest";
import pool from "../src/config/db";
import { firebaseAuth } from "../src/config/firebase";
import { recordDebt } from "../src/services/wallet.service";
import { releaseEscrow } from "../src/services/ledger.service";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { default: app } = await import("../src/app");

const emailOwner = `contract-owner-${Date.now()}@example.com`;
const emailRenter = `contract-renter-${Date.now()}@example.com`;
const password = "ContractPassword123!";

let cookieOwner: string;
let cookieRenter: string;
let uidOwner: string | undefined;
let uidRenter: string | undefined;
let ownerProfileId: string;
let renterProfileId: string;

let resourceId: string;
let dealId: string;
let offerId: string;
let contractId: string;

const test = async (name: string, fn: () => Promise<void>): Promise<void> => {
    try {
        await fn();
        console.log(`✓ ${name}`);
    } catch (error) {
        console.error(`✗ ${name}`);
        console.error(error);
        process.exitCode = 1;
    }
};

const getCookies = (response: request.Response): string[] => {
    const cookies = response.headers["set-cookie"];
    if (!cookies) return [];
    return Array.isArray(cookies) ? cookies : [cookies];
};

const getCookie = (cookies: string[], name: string): string => {
    const cookie = cookies.find((c) => c.startsWith(`${name}=`));
    if (!cookie) throw new Error(`${name} cookie not set`);
    return cookie;
};

const confirmBothParties = async (id: string): Promise<void> => {
    await request(app).post(`/api/contracts/${id}/confirm`).set("Cookie", cookieOwner);
    await request(app).post(`/api/contracts/${id}/confirm`).set("Cookie", cookieRenter);
};

const fetchHandoffToken = async (
    id: string,
    cookie: string,
    purpose: "checkout" | "return"
): Promise<string> => {
    const res = await request(app)
        .get(`/api/contracts/${id}/handoff-token?purpose=${purpose}`)
        .set("Cookie", cookie);
    if (res.status !== 200) {
        throw new Error(`handoff-token failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return res.body.data.token;
};

try {
    await test("register owner and renter with signup grant", async () => {
        const r1 = await request(app).post("/api/auth/register").send({ email: emailOwner, password });
        if (r1.status !== 201) throw new Error(`Expected 201 got ${r1.status}`);
        cookieOwner = getCookie(getCookies(r1), "accessToken");
        uidOwner = (await firebaseAuth.getUserByEmail(emailOwner)).uid;
        ownerProfileId = r1.body.data?.id;

        const r2 = await request(app).post("/api/auth/register").send({ email: emailRenter, password });
        if (r2.status !== 201) throw new Error(`Expected 201 got ${r2.status}`);
        cookieRenter = getCookie(getCookies(r2), "accessToken");
        uidRenter = (await firebaseAuth.getUserByEmail(emailRenter)).uid;
        renterProfileId = r2.body.data?.id;
    });

    await test("create resource with declared value and default deposit tier", async () => {
        const resRes = await request(app)
            .post("/api/resources")
            .set("Cookie", cookieOwner)
            .send({
                title: "Professional DSLR Camera",
                declaredValue: 500,
                lat: 28.61,
                lng: 77.20,
            });
        if (resRes.status !== 201) throw new Error(`Expected 201 got ${resRes.status} ${JSON.stringify(resRes.body)}`);
        resourceId = resRes.body.data?.id;
        if (Number(resRes.body.data?.security_deposit_rate) !== 0.15) {
            throw new Error(`Expected deposit rate 0.15 got ${resRes.body.data?.security_deposit_rate}`);
        }

        const dealRes = await request(app)
            .post("/api/deals")
            .set("Cookie", cookieOwner)
            .send({
                title: "DSLR Camera available for rent",
                resourceId,
                lat: 28.61,
                lng: 77.20,
            });
        if (dealRes.status !== 201) throw new Error(`Expected 201 got ${dealRes.status} ${JSON.stringify(dealRes.body)}`);
        dealId = dealRes.body.data?.id;
    });

    await test("submit offer and accept -> creates contract, captures fee, and locks escrow", async () => {
        const offerRes = await request(app)
            .post(`/api/deals/${dealId}/offers`)
            .set("Cookie", cookieRenter)
            .send({ price: 40, terms: "Weekend rent" });
        if (offerRes.status !== 201) throw new Error(`Expected 201 got ${offerRes.status} ${JSON.stringify(offerRes.body)}`);
        offerId = offerRes.body.data?.id;

        const walletBefore = await request(app).get("/api/wallet").set("Cookie", cookieOwner);
        const balanceBefore = Number(walletBefore.body.data?.balance);

        const acceptRes = await request(app)
            .patch(`/api/offers/${offerId}/accept`)
            .set("Cookie", cookieOwner);
        if (acceptRes.status !== 200) throw new Error(`Expected 200 got ${acceptRes.status} ${JSON.stringify(acceptRes.body)}`);

        const contractsRes = await request(app)
            .get("/api/contracts")
            .set("Cookie", cookieOwner);
        if (contractsRes.status !== 200) throw new Error(`Expected 200 got ${contractsRes.status}`);
        if (!Array.isArray(contractsRes.body.data) || contractsRes.body.data.length === 0) {
            throw new Error("Contract was not automatically created on accept");
        }
        contractId = contractsRes.body.data[0].id;
        const c = contractsRes.body.data[0];
        if (Number(c.declared_value) !== 500) throw new Error(`Expected declared_value 500 got ${c.declared_value}`);
        if (Number(c.lend_fee) !== 40) throw new Error(`Expected lend_fee 40 got ${c.lend_fee}`);
        if (Number(c.security_amount) !== 75) throw new Error(`Expected security_amount 75 got ${c.security_amount}`);

        const resourceBeforeConfirm = await request(app).get(`/api/resources/${resourceId}`);
        if (resourceBeforeConfirm.body.data?.current_holder_id !== ownerProfileId) {
            throw new Error("Holder should remain owner before both parties confirm");
        }

        // stash for cancellation test
        (globalThis as any).__ownerBalanceBeforeAccept = balanceBefore;
    });

    await test("single confirm leaves pending_confirmation, contact hidden, custody unchanged", async () => {
        const confirmRes = await request(app)
            .post(`/api/contracts/${contractId}/confirm`)
            .set("Cookie", cookieOwner);
        if (confirmRes.status !== 200) throw new Error(`Expected 200 got ${confirmRes.status} ${JSON.stringify(confirmRes.body)}`);
        if (confirmRes.body.data?.status !== "pending_confirmation") {
            throw new Error(`Expected pending_confirmation, got ${confirmRes.body.data?.status}`);
        }
        if (confirmRes.body.data?.contact_revealed) {
            throw new Error("Expected contact_revealed false after single confirm");
        }

        const resourceRes = await request(app).get(`/api/resources/${resourceId}`);
        if (resourceRes.body.data?.current_holder_id !== ownerProfileId) {
            throw new Error("Custody must not move until both parties confirm");
        }
    });

    await test("both confirms reveal contact and move custody to requester", async () => {
        await request(app).post(`/api/contracts/${contractId}/confirm`).set("Cookie", cookieRenter);

        const contractRes = await request(app).get(`/api/contracts/${contractId}`).set("Cookie", cookieOwner);
        if (contractRes.body.data?.status !== "confirmed") {
            throw new Error(`Expected confirmed, got ${contractRes.body.data?.status}`);
        }
        if (!contractRes.body.data?.contact_revealed) {
            throw new Error("Expected contact_revealed true after both confirm");
        }

        const resourceRes = await request(app).get(`/api/resources/${resourceId}`);
        if (resourceRes.body.data?.current_holder_id !== renterProfileId) {
            throw new Error("Provider (renter) should hold custody after both confirm");
        }
    });

    await test("checkout requires valid handoff token", async () => {
        const noTokenRes = await request(app)
            .post(`/api/contracts/${contractId}/checkout`)
            .set("Cookie", cookieRenter);
        if (noTokenRes.status !== 400) throw new Error(`Expected 400 got ${noTokenRes.status}`);
        if (noTokenRes.body.error?.code !== "MISSING_HANDOFF_TOKEN") {
            throw new Error(`Expected MISSING_HANDOFF_TOKEN got ${noTokenRes.body.error?.code}`);
        }

        const token = await fetchHandoffToken(contractId, cookieRenter, "checkout");
        const checkoutRes = await request(app)
            .post(`/api/contracts/${contractId}/checkout`)
            .set("Cookie", cookieRenter)
            .send({ token });
        if (checkoutRes.status !== 200) throw new Error(`Expected 200 got ${checkoutRes.status} ${JSON.stringify(checkoutRes.body)}`);
        if (checkoutRes.body.data?.status !== "active") {
            throw new Error(`Expected status 'active', got ${checkoutRes.body.data?.status}`);
        }
        if (!checkoutRes.body.data?.checked_out_at) {
            throw new Error("Expected checked_out_at to be populated");
        }
    });

    await test("return contract with token moves status to returned and sets dispute window", async () => {
        const token = await fetchHandoffToken(contractId, cookieOwner, "return");
        const returnRes = await request(app)
            .post(`/api/contracts/${contractId}/return`)
            .set("Cookie", cookieOwner)
            .send({ token });
        if (returnRes.status !== 200) throw new Error(`Expected 200 got ${returnRes.status} ${JSON.stringify(returnRes.body)}`);
        if (returnRes.body.data?.status !== "returned") {
            throw new Error(`Expected status 'returned', got ${returnRes.body.data?.status}`);
        }
        if (!returnRes.body.data?.dispute_deadline) {
            throw new Error("Expected dispute_deadline to be populated");
        }

        const resourceRes = await request(app).get(`/api/resources/${resourceId}`);
        if (resourceRes.body.data?.current_holder_id !== ownerProfileId) {
            throw new Error("Custody should return to requester (owner) after return");
        }
    });

    await test("dispute condition files report and sets condition_disputed", async () => {
        const disputeRes = await request(app)
            .post(`/api/contracts/${contractId}/dispute-condition`)
            .set("Cookie", cookieRenter)
            .send({
                reason: "damage",
                description: "Lens scratched upon return",
            });
        if (disputeRes.status !== 200) throw new Error(`Expected 200 got ${disputeRes.status} ${JSON.stringify(disputeRes.body)}`);
        if (!disputeRes.body.data?.condition_disputed) {
            throw new Error("Expected condition_disputed to be true");
        }
        if (disputeRes.body.data?.status !== "disputed") {
            throw new Error(`Expected status 'disputed', got ${disputeRes.body.data?.status}`);
        }
    });

    await test("escrow integrity guard throws ESCROW_INTEGRITY_ERROR on shortfall assertion", async () => {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            let threw = false;
            try {
                await releaseEscrow(
                    contractId,
                    ownerProfileId,
                    renterProfileId,
                    99999,
                    "escrow_penalty",
                    client
                );
            } catch (err: any) {
                threw = true;
                if (err.code !== "ESCROW_INTEGRITY_ERROR" && err.code !== "ESCROW_SHORTFALL") {
                    throw new Error(`Expected ESCROW_INTEGRITY_ERROR, got ${err.code}`);
                }
            }
            if (!threw) throw new Error("Expected escrow shortfall assertion to throw");
            await client.query("ROLLBACK");
        } finally {
            client.release();
        }
    });

    await test("cancellation captures 10% fee to platform and reverts custody to requester", async () => {
        const resRes = await request(app)
            .post("/api/resources")
            .set("Cookie", cookieOwner)
            .send({ title: "Cancel fee test item", declaredValue: 500, lat: 28.61, lng: 77.2 });
        const cancelResourceId = resRes.body.data?.id;

        const dealRes = await request(app)
            .post("/api/deals")
            .set("Cookie", cookieOwner)
            .send({ title: "Cancel fee deal", resourceId: cancelResourceId, lat: 28.61, lng: 77.2 });

        const offerRes = await request(app)
            .post(`/api/deals/${dealRes.body.data?.id}/offers`)
            .set("Cookie", cookieRenter)
            .send({ price: 40, terms: "Cancel test" });
        await request(app).patch(`/api/offers/${offerRes.body.data?.id}/accept`).set("Cookie", cookieOwner);

        const contractsRes = await request(app).get("/api/contracts").set("Cookie", cookieOwner);
        const cancelContractId = contractsRes.body.data.find((c: any) => c.id !== contractId)?.id;
        if (!cancelContractId) throw new Error("Cancel test contract not found");

        const walletBefore = await request(app).get("/api/wallet").set("Cookie", cookieOwner);
        const balanceBefore = Number(walletBefore.body.data?.balance);

        await confirmBothParties(cancelContractId);

        const cancelRes = await request(app)
            .post(`/api/contracts/${cancelContractId}/cancel`)
            .set("Cookie", cookieOwner)
            .send({ reason: "Changed plans" });
        if (cancelRes.status !== 200) throw new Error(`Cancel failed: ${cancelRes.status} ${JSON.stringify(cancelRes.body)}`);

        const walletAfter = await request(app).get("/api/wallet").set("Cookie", cookieOwner);
        const balanceAfter = Number(walletAfter.body.data?.balance);

        const escrowTotal = 40 + 75;
        const expectedRefund = escrowTotal * 0.9;
        const netChange = balanceAfter - balanceBefore;

        if (Math.abs(netChange - expectedRefund) > 0.01) {
            throw new Error(`Expected net refund ${expectedRefund}, balance changed by ${netChange}`);
        }

        const resourceRes = await request(app).get(`/api/resources/${cancelResourceId}`);
        if (resourceRes.body.data?.current_holder_id !== ownerProfileId) {
            throw new Error("Custody should revert to requester (owner) on cancel");
        }
    });

    await test("cancel after confirm-but-before-checkout reverts custody to requester", async () => {
        const resRes = await request(app)
            .post("/api/resources")
            .set("Cookie", cookieOwner)
            .send({ title: "Mid cancel item", declaredValue: 500, lat: 28.61, lng: 77.2 });
        const midResourceId = resRes.body.data?.id;

        const dealRes = await request(app)
            .post("/api/deals")
            .set("Cookie", cookieOwner)
            .send({ title: "Mid cancel deal", resourceId: midResourceId, lat: 28.61, lng: 77.2 });

        const offerRes = await request(app)
            .post(`/api/deals/${dealRes.body.data?.id}/offers`)
            .set("Cookie", cookieRenter)
            .send({ price: 25, terms: "Mid-flow cancel" });
        if (offerRes.status !== 201) throw new Error(`Offer failed: ${offerRes.status}`);
        await request(app).patch(`/api/offers/${offerRes.body.data?.id}/accept`).set("Cookie", cookieOwner);

        const contractsRes = await request(app).get("/api/contracts").set("Cookie", cookieOwner);
        const midContractId = contractsRes.body.data.find(
            (c: any) => c.resource_id === midResourceId
        )?.id;
        if (!midContractId) throw new Error("Mid-flow contract not found");

        await confirmBothParties(midContractId);

        await request(app)
            .post(`/api/contracts/${midContractId}/cancel`)
            .set("Cookie", cookieOwner);

        const afterCancel = await request(app).get(`/api/resources/${midResourceId}`);
        if (afterCancel.body.data?.current_holder_id !== ownerProfileId) {
            throw new Error(`Expected custody reverted to requester ${ownerProfileId}`);
        }
    });

    await test("rate completed contract persists rating and updates profile aggregates", async () => {
        const resRes = await request(app)
            .post("/api/resources")
            .set("Cookie", cookieOwner)
            .send({ title: "Rating item", declaredValue: 200, lat: 28.61, lng: 77.2 });
        const rateResourceId = resRes.body.data?.id;

        const dealRes = await request(app)
            .post("/api/deals")
            .set("Cookie", cookieOwner)
            .send({ title: "Rating deal", resourceId: rateResourceId, lat: 28.61, lng: 77.2 });

        const offerRes = await request(app)
            .post(`/api/deals/${dealRes.body.data?.id}/offers`)
            .set("Cookie", cookieRenter)
            .send({ price: 15, terms: "Rate me" });
        await request(app).patch(`/api/offers/${offerRes.body.data?.id}/accept`).set("Cookie", cookieOwner);

        const contractsRes = await request(app).get("/api/contracts").set("Cookie", cookieOwner);
        const rateContractId = contractsRes.body.data.find(
            (c: any) => c.resource_id === rateResourceId
        )?.id;
        if (!rateContractId) throw new Error("Rating contract not found");

        await confirmBothParties(rateContractId);

        const checkoutToken = await fetchHandoffToken(rateContractId, cookieRenter, "checkout");
        await request(app)
            .post(`/api/contracts/${rateContractId}/checkout`)
            .set("Cookie", cookieRenter)
            .send({ token: checkoutToken });

        const returnToken = await fetchHandoffToken(rateContractId, cookieOwner, "return");
        await request(app)
            .post(`/api/contracts/${rateContractId}/return`)
            .set("Cookie", cookieOwner)
            .send({ token: returnToken });

        // Force completed (skip dispute window) for rating test
        await pool.query(
            `UPDATE contracts SET status = 'completed', updated_at = now() WHERE id = $1`,
            [rateContractId]
        );

        const rateRes = await request(app)
            .post(`/api/contracts/${rateContractId}/rate`)
            .set("Cookie", cookieOwner)
            .send({ score: 5, review: "Excellent borrower" });
        if (rateRes.status !== 200) {
            throw new Error(`Rate failed: ${rateRes.status} ${JSON.stringify(rateRes.body)}`);
        }
        if (rateRes.body.data?.score !== 5) {
            throw new Error(`Expected score 5 got ${rateRes.body.data?.score}`);
        }

        const ratedProfile = await pool.query(
            `SELECT avg_rating, rating_count FROM profiles WHERE id = $1`,
            [renterProfileId]
        );
        if (Number(ratedProfile.rows[0]?.rating_count) < 1) {
            throw new Error("Expected rating_count >= 1 on rated profile");
        }
        if (Number(ratedProfile.rows[0]?.avg_rating) < 1) {
            throw new Error("Expected avg_rating to be updated");
        }

        const row = await pool.query(
            `SELECT * FROM ratings WHERE contract_id = $1 AND rater_id = $2`,
            [rateContractId, ownerProfileId]
        );
        if (!row.rows[0]) throw new Error("Expected ratings row to persist");
    });

    await test("DEBT_BLOCK prevents creating deals and offers when user has outstanding debt", async () => {
        await recordDebt(renterProfileId, 250, contractId);

        const dealBlockRes = await request(app)
            .post("/api/deals")
            .set("Cookie", cookieRenter)
            .send({ title: "Blocked Deal", lat: 28.6, lng: 77.2 });
        if (dealBlockRes.status !== 403) throw new Error(`Expected 403 got ${dealBlockRes.status} ${JSON.stringify(dealBlockRes.body)}`);
        if (dealBlockRes.body.error?.code !== "DEBT_BLOCK" && dealBlockRes.body.error?.code !== "DEBT_OUTSTANDING") {
            throw new Error(`Expected DEBT_BLOCK/DEBT_OUTSTANDING got ${dealBlockRes.body.error?.code}`);
        }

        const offerBlockRes = await request(app)
            .post(`/api/deals/${dealId}/offers`)
            .set("Cookie", cookieRenter)
            .send({ price: 20 });
        if (offerBlockRes.status !== 403) throw new Error(`Expected 403 got ${offerBlockRes.status}`);
        if (offerBlockRes.body.error?.code !== "DEBT_BLOCK" && offerBlockRes.body.error?.code !== "DEBT_OUTSTANDING") {
            throw new Error(`Expected DEBT_BLOCK got ${offerBlockRes.body.error?.code}`);
        }
    });
} finally {
    if (uidOwner) try { await firebaseAuth.deleteUser(uidOwner); } catch (e) { console.error(e); }
    if (uidRenter) try { await firebaseAuth.deleteUser(uidRenter); } catch (e) { console.error(e); }
    await pool.end();
    console.log("\nContracts tests completed.\n");
}
