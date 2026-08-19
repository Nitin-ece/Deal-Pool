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
                declaredValue: 500, // <= 500 -> tier 15% (0.15)
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
        // Offer price 40 (<= 10% of 500 = 50)
        const offerRes = await request(app)
            .post(`/api/deals/${dealId}/offers`)
            .set("Cookie", cookieRenter)
            .send({ price: 40, terms: "Weekend rent" });
        if (offerRes.status !== 201) throw new Error(`Expected 201 got ${offerRes.status} ${JSON.stringify(offerRes.body)}`);
        offerId = offerRes.body.data?.id;

        const acceptRes = await request(app)
            .patch(`/api/offers/${offerId}/accept`)
            .set("Cookie", cookieOwner);
        if (acceptRes.status !== 200) throw new Error(`Expected 200 got ${acceptRes.status} ${JSON.stringify(acceptRes.body)}`);

        // List contracts for owner
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
    });

    await test("confirm contract reveals contact info and moves custody", async () => {
        const confirmRes = await request(app)
            .post(`/api/contracts/${contractId}/confirm`)
            .set("Cookie", cookieOwner);
        if (confirmRes.status !== 200) throw new Error(`Expected 200 got ${confirmRes.status} ${JSON.stringify(confirmRes.body)}`);
        if (confirmRes.body.data?.status !== "confirmed") {
            throw new Error(`Expected status 'confirmed', got ${confirmRes.body.data?.status}`);
        }
        if (!confirmRes.body.data?.contact_revealed) {
            throw new Error("Expected contact_revealed to be true");
        }
    });

    await test("checkout contract moves status to 'active' and records checked_out_at", async () => {
        const checkoutRes = await request(app)
            .post(`/api/contracts/${contractId}/checkout`)
            .set("Cookie", cookieRenter);
        if (checkoutRes.status !== 200) throw new Error(`Expected 200 got ${checkoutRes.status} ${JSON.stringify(checkoutRes.body)}`);
        if (checkoutRes.body.data?.status !== "active") {
            throw new Error(`Expected status 'active', got ${checkoutRes.body.data?.status}`);
        }
        if (!checkoutRes.body.data?.checked_out_at) {
            throw new Error("Expected checked_out_at to be populated");
        }
    });

    await test("return contract moves status to 'returned', releases lend fee, and sets dispute window", async () => {
        const returnRes = await request(app)
            .post(`/api/contracts/${contractId}/return`)
            .set("Cookie", cookieOwner);
        if (returnRes.status !== 200) throw new Error(`Expected 200 got ${returnRes.status} ${JSON.stringify(returnRes.body)}`);
        if (returnRes.body.data?.status !== "returned") {
            throw new Error(`Expected status 'returned', got ${returnRes.body.data?.status}`);
        }
        if (!returnRes.body.data?.dispute_deadline) {
            throw new Error("Expected dispute_deadline to be populated");
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
                // Attempt to release 99999 from contract which only has deposit
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

    await test("DEBT_BLOCK prevents creating deals and offers when user has outstanding debt", async () => {
        // Record test debt for renter
        await recordDebt(renterProfileId, 250, contractId);

        // Attempt deal creation
        const dealBlockRes = await request(app)
            .post("/api/deals")
            .set("Cookie", cookieRenter)
            .send({ title: "Blocked Deal", lat: 28.6, lng: 77.2 });
        if (dealBlockRes.status !== 403) throw new Error(`Expected 403 got ${dealBlockRes.status} ${JSON.stringify(dealBlockRes.body)}`);
        if (dealBlockRes.body.error?.code !== "DEBT_BLOCK" && dealBlockRes.body.error?.code !== "DEBT_OUTSTANDING") {
            throw new Error(`Expected DEBT_BLOCK/DEBT_OUTSTANDING got ${dealBlockRes.body.error?.code}`);
        }

        // Attempt offer creation
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
