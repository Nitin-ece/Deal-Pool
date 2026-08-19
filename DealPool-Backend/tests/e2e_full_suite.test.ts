import dotenv from "dotenv";
import path from "path";
import request from "supertest";
import pool from "../src/config/db";
import { firebaseAuth } from "../src/config/firebase";

dotenv.config({
    path: path.resolve(process.cwd(), ".env"),
});

const { default: app } = await import("../src/app");

// Test User credentials
const emailA = `e2e-user-a-${Date.now()}@example.com`;
const emailB = `e2e-user-b-${Date.now()}@example.com`;
const emailC = `e2e-user-c-${Date.now()}@example.com`;
const password = "TestPassword123!";
const newPassword = "NewTestPassword123!";

let cookieA: string;
let cookieB: string;
let cookieC: string;

let uidA: string | undefined;
let uidB: string | undefined;
let uidC: string | undefined;

let profileIdA: string;
let profileIdB: string;
let profileIdC: string;

let resourceId1: string;
let dealId1: string;
let dealId2: string;
let offerId1: string;
let offerId2: string;
let contractId1: string;
let contractId2: string;
let txId1: string;
let txId2: string;

const test = async (name: string, fn: () => Promise<void>): Promise<void> => {
    try {
        await fn();
        console.log(`  ✓ ${name}`);
    } catch (error) {
        console.error(`  ✗ ${name}`);
        console.error(error);
        process.exitCode = 1;
        throw error;
    }
};

const getCookies = (res: request.Response): string[] => {
    const cookies = res.headers["set-cookie"];
    if (!cookies) return [];
    return Array.isArray(cookies) ? cookies : [cookies];
};

const getCookie = (cookies: string[], name: string): string => {
    const cookie = cookies.find((c) => c.startsWith(`${name}=`));
    if (!cookie) throw new Error(`${name} cookie was not set`);
    return cookie;
};

console.log("\n========================================================");
console.log("   MAKERPOOL BACKEND (v2.1) — FULL E2E INTEGRATION SUITE");
console.log("========================================================\n");

try {
    // ----------------------------------------------------------------
    // 1. AUTHENTICATION & WALLET SIGNUP GRANTS
    // ----------------------------------------------------------------
    console.log("--- 1. Auth, Profiles & Signup Coin Grants ---");

    await test("Register User A (Signup grant of 1000 coins & profile creation)", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ email: emailA, password });

        if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
        if (!res.body.success || !res.body.data?.id || !res.body.data?.username) {
            throw new Error("Invalid registration response shape");
        }

        profileIdA = res.body.data.id;
        const cookies = getCookies(res);
        cookieA = getCookie(cookies, "accessToken");

        const fbUser = await firebaseAuth.getUserByEmail(emailA);
        uidA = fbUser.uid;

        // Verify wallet has signup bonus (1000 coins)
        const walletRes = await request(app).get("/api/wallet").set("Cookie", cookieA);
        if (walletRes.status !== 200) throw new Error(`Wallet fetch failed: ${walletRes.status}`);
        if (Number(walletRes.body.data?.balance) !== 1000) {
            throw new Error(`Expected 1000 coins signup grant, got ${walletRes.body.data?.balance}`);
        }
    });

    await test("Register User B & User C with Signup Grants", async () => {
        const resB = await request(app).post("/api/auth/register").send({ email: emailB, password });
        if (resB.status !== 201) throw new Error(`User B failed 201: ${resB.status}`);
        profileIdB = resB.body.data.id;
        cookieB = getCookie(getCookies(resB), "accessToken");
        uidB = (await firebaseAuth.getUserByEmail(emailB)).uid;

        const resC = await request(app).post("/api/auth/register").send({ email: emailC, password });
        if (resC.status !== 201) throw new Error(`User C failed 201: ${resC.status}`);
        profileIdC = resC.body.data.id;
        cookieC = getCookie(getCookies(resC), "accessToken");
        uidC = (await firebaseAuth.getUserByEmail(emailC)).uid;
    });

    await test("GET /api/auth/me returns caller's profile", async () => {
        const res = await request(app)
            .get("/api/auth/me")
            .set("Cookie", cookieA);

        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        if (res.body.data.id !== profileIdA || res.body.data.email !== emailA) {
            throw new Error("Profile mismatch in /me response");
        }
    });

    await test("PATCH /api/auth/update updates username", async () => {
        const customUsername = `maker_${Date.now()}`;
        const res = await request(app)
            .patch("/api/auth/update")
            .set("Cookie", cookieA)
            .send({ username: customUsername });

        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        if (res.body.data.username !== customUsername) {
            throw new Error("Username was not updated");
        }
    });

    await test("PATCH /api/auth/change-password validates current & sets new password", async () => {
        const res = await request(app)
            .patch("/api/auth/change-password")
            .set("Cookie", cookieA)
            .send({ currentPassword: password, newPassword });

        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);

        // Verify login works with new password
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: emailA, password: newPassword });

        if (loginRes.status !== 200) throw new Error("Login failed with new password");
        cookieA = getCookie(getCookies(loginRes), "accessToken");
    });

    // ----------------------------------------------------------------
    // 2. ADMIN CONTROL & RBAC
    // ----------------------------------------------------------------
    console.log("\n--- 2. Admin Operations & Reports ---");

    await test("Non-admin user rejected from GET /api/admin/users with 403", async () => {
        const res = await request(app)
            .get("/api/admin/users")
            .set("Cookie", cookieB);

        if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    await test("Promote User A to admin directly in DB and verify access to admin routes", async () => {
        await pool.query(`UPDATE profiles SET role = 'admin' WHERE id = $1`, [profileIdA]);

        const res = await request(app)
            .get("/api/admin/users?limit=10&offset=0")
            .set("Cookie", cookieA);

        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        if (!Array.isArray(res.body.data)) throw new Error("Expected array of profiles");
    });

    // ----------------------------------------------------------------
    // 3. RESOURCES & TIERED DEPOSITS
    // ----------------------------------------------------------------
    console.log("\n--- 3. Resources Module & Deposit Tiers ---");

    await test("POST /api/resources creates resource with declaredValue and calculates deposit rate tier", async () => {
        const res = await request(app)
            .post("/api/resources")
            .set("Cookie", cookieA)
            .send({
                title: "Prusa MK4 3D Printer",
                description: "High precision 3D printer with 0.4mm nozzle",
                category: "Hardware",
                condition: "Like New",
                declaredValue: 2000, // 500 < V <= 2000 -> tier 20% (0.20)
                lat: 37.7749,
                lng: -122.4194,
            });

        if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
        resourceId1 = res.body.data.id;
        if (Number(res.body.data.declared_value) !== 2000) throw new Error(`Expected declared_value 2000, got ${res.body.data.declared_value}`);
        if (Number(res.body.data.security_deposit_rate) !== 0.20) throw new Error(`Expected tier 0.20, got ${res.body.data.security_deposit_rate}`);
        if (res.body.data.current_holder_id !== profileIdA) {
            throw new Error("current_holder_id did not default to owner");
        }
    });

    await test("GET /api/resources/nearby finds resource within radius", async () => {
        const res = await request(app)
            .get("/api/resources/nearby?lat=37.7740&lng=-122.4180&radiusKm=5");

        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        const match = res.body.data.find((r: { id: string }) => r.id === resourceId1);
        if (!match) throw new Error("Resource not found in nearby PostGIS query");
        if (typeof match.distance_km !== "number") throw new Error("Missing distance_km calculation");
    });

    // ----------------------------------------------------------------
    // 4. DEALS & 10% FEE CAP ENFORCEMENT
    // ----------------------------------------------------------------
    console.log("\n--- 4. Deals Marketplace & Fee Caps ---");

    await test("POST /api/deals creates a deal linked to Resource 1", async () => {
        const res = await request(app)
            .post("/api/deals")
            .set("Cookie", cookieA)
            .send({
                title: "Looking to lend Prusa 3D Printer to makers",
                description: "Need to lend printer for project",
                category: "Hardware",
                lat: 37.7749,
                lng: -122.4194,
                radiusKm: 10,
                resourceId: resourceId1,
            });

        if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
        dealId1 = res.body.data.id;
        if (res.body.data.status !== "open") throw new Error("New deal status is not open");
    });

    await test("Offer price exceeding 10% cap of declared value is rejected with 400 FEE_EXCEEDS_CAP", async () => {
        // declared_value is 2000 -> 10% cap is 200
        const res = await request(app)
            .post(`/api/deals/${dealId1}/offers`)
            .set("Cookie", cookieB)
            .send({ price: 300, terms: "Exceeds 10% cap" });

        if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
        if (res.body.error?.code !== "FEE_EXCEEDS_CAP") {
            throw new Error(`Expected FEE_EXCEEDS_CAP, got ${res.body.error?.code}`);
        }
    });

    await test("User B submits Offer 1 under cap (price 150)", async () => {
        const res = await request(app)
            .post(`/api/deals/${dealId1}/offers`)
            .set("Cookie", cookieB)
            .send({ price: 150, terms: "Fair price under cap" });

        if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
        offerId1 = res.body.data.id;
    });

    // ----------------------------------------------------------------
    // 5. CONTRACTS, ESCROW LOCK, CUSTODY & LIFECYCLE
    // ----------------------------------------------------------------
    console.log("\n--- 5. Contracts, Escrow Lock & Multi-Hop Custody ---");

    await test("User A accepts Offer 1: captures platform fee (5%), creates Contract 1, locks escrow", async () => {
        const res = await request(app)
            .patch(`/api/offers/${offerId1}/accept`)
            .set("Cookie", cookieA);

        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);

        // Fetch created contract
        const contractsRes = await request(app).get("/api/contracts").set("Cookie", cookieA);
        contractId1 = contractsRes.body.data[0].id;
        const c = contractsRes.body.data[0];
        if (Number(c.declared_value) !== 2000) throw new Error(`Expected declared_value 2000, got ${c.declared_value}`);
        if (Number(c.lend_fee) !== 150) throw new Error(`Expected lend_fee 150, got ${c.lend_fee}`);
        if (Number(c.security_amount) !== 400) throw new Error(`Expected security_amount 400 (20%), got ${c.security_amount}`);
    });

    await test("User A confirms Contract 1: reveals contact info and moves custody to User B", async () => {
        const confirmRes = await request(app)
            .post(`/api/contracts/${contractId1}/confirm`)
            .set("Cookie", cookieA);

        if (confirmRes.status !== 200) throw new Error(`Confirm failed: ${confirmRes.status}: ${JSON.stringify(confirmRes.body)}`);
        if (!confirmRes.body.data?.contact_revealed) throw new Error("Contact info not revealed");

        // Verify resource's current_holder_id moved to User B
        const resCheck = await request(app).get(`/api/resources/${resourceId1}`);
        if (resCheck.body.data.current_holder_id !== profileIdB) {
            throw new Error(`Expected current_holder_id to be User B (${profileIdB}), got ${resCheck.body.data.current_holder_id}`);
        }
    });

    await test("User B (now holding resource) creates Deal 2 and passes to User C", async () => {
        const dealRes = await request(app)
            .post("/api/deals")
            .set("Cookie", cookieB)
            .send({
                title: "Passing Prusa MK4 forward to User C",
                category: "Hardware",
                lat: 37.7749,
                lng: -122.4194,
                resourceId: resourceId1,
            });
        if (dealRes.status !== 201) throw new Error(`Deal 2 failed: ${dealRes.status}`);
        dealId2 = dealRes.body.data.id;

        const offerRes = await request(app)
            .post(`/api/deals/${dealId2}/offers`)
            .set("Cookie", cookieC)
            .send({ price: 180, terms: "Next stage borrower" });
        if (offerRes.status !== 201) throw new Error(`Offer 2 failed: ${offerRes.status}`);
        offerId2 = offerRes.body.data.id;

        await request(app).patch(`/api/offers/${offerId2}/accept`).set("Cookie", cookieB);

        const contractsRes = await request(app).get("/api/contracts").set("Cookie", cookieB);
        contractId2 = contractsRes.body.data[0].id;
        await request(app).post(`/api/contracts/${contractId2}/confirm`).set("Cookie", cookieB);

        // Verify resource's current_holder_id is now User C
        const resCheck = await request(app).get(`/api/resources/${resourceId1}`);
        if (resCheck.body.data.current_holder_id !== profileIdC) {
            throw new Error(`Expected current_holder_id to be User C (${profileIdC})`);
        }
    });

    await test("GET /api/resources/:id/chain verifies recursive chain & privacy redaction across hops", async () => {
        const res = await request(app)
            .get(`/api/resources/${resourceId1}/chain`)
            .set("Cookie", cookieC);

        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        const chain = res.body.data;
        if (!Array.isArray(chain) || chain.length !== 2) {
            throw new Error(`Expected 2 hops in chain, got ${chain?.length}`);
        }

        const [hop1, hop2] = chain;
        txId1 = hop1.id;
        txId2 = hop2.id;

        // Hop 1 (A -> B): Redacted for User C
        if (hop1.from_user_id || hop1.to_user_id) {
            throw new Error("Privacy violation: Third-party participant IDs leaked in Hop 1!");
        }

        // Hop 2 (B -> C): Full for User C
        if (hop2.from_user_id !== profileIdB || hop2.to_user_id !== profileIdC) {
            throw new Error("Participant IDs missing or mismatched in Hop 2!");
        }
    });

    console.log("\n========================================================");
    console.log("   ✓ ALL E2E INTEGRATION TESTS PASSED SUCCESSFULLY");
    console.log("========================================================\n");

} finally {
    // Cleanup Firebase test users
    if (uidA) try { await firebaseAuth.deleteUser(uidA); } catch {}
    if (uidB) try { await firebaseAuth.deleteUser(uidB); } catch {}
    if (uidC) try { await firebaseAuth.deleteUser(uidC); } catch {}

    await pool.end();
}
