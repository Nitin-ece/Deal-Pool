import dotenv from "dotenv";
import path from "path";
import request from "supertest";
import pool from "../src/config/db";
import { firebaseAuth } from "../src/config/firebase";
import { updateProfileRole } from "../src/models/user.model";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { default: app } = await import("../src/app");

const emailAdmin = `report-admin-${Date.now()}@example.com`;
const emailRequester = `report-req-${Date.now()}@example.com`;
const emailProvider = `report-prov-${Date.now()}@example.com`;
const password = "ReportPassword123!";

let cookieAdmin: string;
let cookieRequester: string;
let cookieProvider: string;
let uidAdmin: string | undefined;
let uidRequester: string | undefined;
let uidProvider: string | undefined;

let adminProfileId: string;
let requesterProfileId: string;
let providerProfileId: string;

let resourceId: string;
let dealId: string;
let offerId: string;
let contractId: string;
let reportId: string;

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
    await test("register admin, requester, and provider", async () => {
        const rAdmin = await request(app).post("/api/auth/register").send({ email: emailAdmin, password });
        cookieAdmin = getCookie(getCookies(rAdmin), "accessToken");
        uidAdmin = (await firebaseAuth.getUserByEmail(emailAdmin)).uid;
        adminProfileId = rAdmin.body.data?.id;
        await updateProfileRole(adminProfileId, "admin");

        const rReq = await request(app).post("/api/auth/register").send({ email: emailRequester, password });
        cookieRequester = getCookie(getCookies(rReq), "accessToken");
        uidRequester = (await firebaseAuth.getUserByEmail(emailRequester)).uid;
        requesterProfileId = rReq.body.data?.id;

        const rProv = await request(app).post("/api/auth/register").send({ email: emailProvider, password });
        cookieProvider = getCookie(getCookies(rProv), "accessToken");
        uidProvider = (await firebaseAuth.getUserByEmail(emailProvider)).uid;
        providerProfileId = rProv.body.data?.id;
    });

    await test("setup contract and move to returned status", async () => {
        // Create resource & deal (declaredValue: 200, tier deposit: 15% = 30)
        const resRes = await request(app).post("/api/resources").set("Cookie", cookieRequester).send({
            title: "Projector 4K",
            declaredValue: 200,
            lat: 12.97,
            lng: 77.59,
        });
        resourceId = resRes.body.data?.id;

        const dealRes = await request(app).post("/api/deals").set("Cookie", cookieRequester).send({
            title: "Need Projector",
            resourceId,
            lat: 12.97,
            lng: 77.59,
        });
        dealId = dealRes.body.data?.id;

        // Provider offers (<= 10% of 200 = 20)
        const offerRes = await request(app).post(`/api/deals/${dealId}/offers`).set("Cookie", cookieProvider).send({
            price: 15,
            terms: "1 day use",
        });
        offerId = offerRes.body.data?.id;

        // Requester accepts
        await request(app).patch(`/api/offers/${offerId}/accept`).set("Cookie", cookieRequester);

        // Fetch contract
        const contractsRes = await request(app).get("/api/contracts").set("Cookie", cookieRequester);
        contractId = contractsRes.body.data[0].id;

        // Confirm
        await request(app).post(`/api/contracts/${contractId}/confirm`).set("Cookie", cookieRequester);

        // Checkout and return
        await request(app).post(`/api/contracts/${contractId}/checkout`).set("Cookie", cookieProvider);
        await request(app).post(`/api/contracts/${contractId}/return`).set("Cookie", cookieRequester);
    });

    await test("POST /api/reports creates a dispute and marks contract condition_disputed", async () => {
        const res = await request(app).post("/api/reports").set("Cookie", cookieProvider).send({
            contractId,
            reason: "damage",
            description: "Lens cracked upon return",
        });
        if (res.status !== 201) throw new Error(`Expected 201 got ${res.status} ${JSON.stringify(res.body)}`);
        reportId = res.body.data?.id;

        // Verify contract is disputed
        const contractRes = await request(app).get(`/api/contracts/${contractId}`).set("Cookie", cookieRequester);
        if (contractRes.body.data?.status !== "disputed" || !contractRes.body.data?.condition_disputed) {
            throw new Error("Contract not marked disputed");
        }
    });

    await test("GET /api/admin/reports lists reports for admin", async () => {
        const adminReportsRes = await request(app).get("/api/admin/reports").set("Cookie", cookieAdmin);
        if (adminReportsRes.status !== 200) throw new Error(`Expected 200 got ${adminReportsRes.status}`);
        if (!Array.isArray(adminReportsRes.body.data) || adminReportsRes.body.data.length === 0) {
            throw new Error("Expected at least one report in admin listing");
        }
    });

    await test("POST /api/reports/:id/resolve with damage award > securityAmount creates debt and strike", async () => {
        // Damage award is 300 (security deposit is 30 -> shortfall 270)
        const resolveRes = await request(app)
            .post(`/api/reports/${reportId}/resolve`)
            .set("Cookie", cookieAdmin)
            .send({
                outcome: "damage",
                damageAward: 300,
                notes: "Severe lens replacement needed",
            });
        if (resolveRes.status !== 200) throw new Error(`Expected 200 got ${resolveRes.status} ${JSON.stringify(resolveRes.body)}`);
        if (resolveRes.body.data?.status !== "resolved_damage") {
            throw new Error(`Expected resolved_damage got ${resolveRes.body.data?.status}`);
        }

        // Verify debt recorded for requester (300 - 30 = 270)
        const debtsRes = await request(app).get("/api/wallet/debts").set("Cookie", cookieRequester);
        if (!debtsRes.body.data || debtsRes.body.data.length === 0) {
            throw new Error("Expected debt to be recorded for requester");
        }
        if (Number(debtsRes.body.data[0].amount) !== 270) {
            throw new Error(`Expected debt amount 270, got ${debtsRes.body.data[0].amount}`);
        }

        // Verify contract is completed
        const contractRes = await request(app).get(`/api/contracts/${contractId}`).set("Cookie", cookieRequester);
        if (contractRes.body.data?.status !== "completed") {
            throw new Error(`Expected contract completed, got ${contractRes.body.data?.status}`);
        }
    });
} finally {
    if (uidAdmin) try { await firebaseAuth.deleteUser(uidAdmin); } catch (e) { console.error(e); }
    if (uidRequester) try { await firebaseAuth.deleteUser(uidRequester); } catch (e) { console.error(e); }
    if (uidProvider) try { await firebaseAuth.deleteUser(uidProvider); } catch (e) { console.error(e); }
    await pool.end();
    console.log("\nReports tests completed.\n");
}
