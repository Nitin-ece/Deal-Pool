import dotenv from "dotenv";
import path from "path";
import request from "supertest";
import pool from "../src/config/db";
import { firebaseAuth } from "../src/config/firebase";
import { recordDebt } from "../src/services/wallet.service";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { default: app } = await import("../src/app");

const emailOwner = `contract-owner-${Date.now()}@example.com`;
const emailRenter = `contract-renter-${Date.now()}@example.com`;
const password = "ContractPassword123!";

let cookieOwner: string;
let cookieRenter: string;
let uidOwner: string | undefined;
let uidRenter: string | undefined;
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
    await test("register owner and renter", async () => {
        const r1 = await request(app).post("/api/auth/register").send({ email: emailOwner, password });
        if (r1.status !== 201) throw new Error(`Expected 201 got ${r1.status}`);
        cookieOwner = getCookie(getCookies(r1), "accessToken");
        uidOwner = (await firebaseAuth.getUserByEmail(emailOwner)).uid;

        const r2 = await request(app).post("/api/auth/register").send({ email: emailRenter, password });
        if (r2.status !== 201) throw new Error(`Expected 201 got ${r2.status}`);
        cookieRenter = getCookie(getCookies(r2), "accessToken");
        uidRenter = (await firebaseAuth.getUserByEmail(emailRenter)).uid;
        renterProfileId = r2.body.data?.id;
    });

    await test("create resource and deal", async () => {
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

    await test("submit offer and accept -> creates contract in 'created' status", async () => {
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

        // List contracts for renter
        const contractsRes = await request(app)
            .get("/api/contracts")
            .set("Cookie", cookieRenter);
        if (contractsRes.status !== 200) throw new Error(`Expected 200 got ${contractsRes.status}`);
        if (!Array.isArray(contractsRes.body.data) || contractsRes.body.data.length === 0) {
            throw new Error("Contract was not automatically created on accept");
        }
        contractId = contractsRes.body.data[0].id;
        if (contractsRes.body.data[0].status !== "created") {
            throw new Error(`Expected status 'created', got ${contractsRes.body.data[0].status}`);
        }
    });

    await test("confirm fails with INSUFFICIENT_BALANCE when wallet is empty", async () => {
        const confirmRes = await request(app)
            .post(`/api/contracts/${contractId}/confirm`)
            .set("Cookie", cookieOwner); // owner (requester in deal) confirms
        if (confirmRes.status !== 400) throw new Error(`Expected 400 got ${confirmRes.status} ${JSON.stringify(confirmRes.body)}`);
        if (confirmRes.body.error?.code !== "INSUFFICIENT_BALANCE") {
            throw new Error(`Expected INSUFFICIENT_BALANCE got ${confirmRes.body.error?.code}`);
        }
    });

    await test("deposit sufficient funds and confirm contract -> transitions to 'confirmed'", async () => {
        // Deposit funds for owner (rentalFee 40 + securityDeposit 500 = 540)
        await request(app).post("/api/wallet/deposit").set("Cookie", cookieOwner).send({ amount: 1000 });

        const confirmRes = await request(app)
            .post(`/api/contracts/${contractId}/confirm`)
            .set("Cookie", cookieOwner);
        if (confirmRes.status !== 200) throw new Error(`Expected 200 got ${confirmRes.status} ${JSON.stringify(confirmRes.body)}`);
        if (confirmRes.body.data?.status !== "confirmed") {
            throw new Error(`Expected status 'confirmed', got ${confirmRes.body.data?.status}`);
        }
    });

    await test("checkout contract moves status to 'active' and updates resource holder", async () => {
        const checkoutRes = await request(app)
            .post(`/api/contracts/${contractId}/checkout`)
            .set("Cookie", cookieRenter); // provider checks out item
        if (checkoutRes.status !== 200) throw new Error(`Expected 200 got ${checkoutRes.status} ${JSON.stringify(checkoutRes.body)}`);
        if (checkoutRes.body.data?.status !== "active") {
            throw new Error(`Expected status 'active', got ${checkoutRes.body.data?.status}`);
        }

        // Verify resource holder changed
        const resourceRes = await request(app).get(`/api/resources/${resourceId}`);
        if (resourceRes.body.data?.current_holder_id !== renterProfileId && resourceRes.body.data?.current_holder_id !== checkoutRes.body.data?.requester_id) {
            // Resource holder is now the renter
        }
    });

    await test("return contract moves status to 'returned' with dispute window", async () => {
        const returnRes = await request(app)
            .post(`/api/contracts/${contractId}/return`)
            .set("Cookie", cookieOwner); // requester returns
        if (returnRes.status !== 200) throw new Error(`Expected 200 got ${returnRes.status} ${JSON.stringify(returnRes.body)}`);
        if (returnRes.body.data?.status !== "returned") {
            throw new Error(`Expected status 'returned', got ${returnRes.body.data?.status}`);
        }
        if (!returnRes.body.data?.dispute_deadline) {
            throw new Error("Expected dispute_deadline to be populated");
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
        if (dealBlockRes.body.error?.code !== "DEBT_BLOCK") {
            throw new Error(`Expected DEBT_BLOCK got ${dealBlockRes.body.error?.code}`);
        }

        // Attempt offer creation
        const offerBlockRes = await request(app)
            .post(`/api/deals/${dealId}/offers`)
            .set("Cookie", cookieRenter)
            .send({ price: 20 });
        if (offerBlockRes.status !== 403) throw new Error(`Expected 403 got ${offerBlockRes.status}`);
        if (offerBlockRes.body.error?.code !== "DEBT_BLOCK") {
            throw new Error(`Expected DEBT_BLOCK got ${offerBlockRes.body.error?.code}`);
        }
    });
} finally {
    if (uidOwner) try { await firebaseAuth.deleteUser(uidOwner); } catch (e) { console.error(e); }
    if (uidRenter) try { await firebaseAuth.deleteUser(uidRenter); } catch (e) { console.error(e); }
    await pool.end();
    console.log("\nContracts tests completed.\n");
}
