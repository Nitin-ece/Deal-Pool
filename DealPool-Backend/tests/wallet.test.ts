import dotenv from "dotenv";
import path from "path";
import request from "supertest";
import pool from "../src/config/db";
import { firebaseAuth } from "../src/config/firebase";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { default: app } = await import("../src/app");

const email = `wallet-user-${Date.now()}@example.com`;
const password = "WalletPassword123!";

let cookie: string;
let uid: string | undefined;

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
    await test("register wallet user", async () => {
        const r = await request(app).post("/api/auth/register").send({ email, password });
        if (r.status !== 201) throw new Error(`Expected 201 got ${r.status} ${JSON.stringify(r.body)}`);
        cookie = getCookie(getCookies(r), "accessToken");
        uid = (await firebaseAuth.getUserByEmail(email)).uid;
    });

    await test("GET /api/wallet initializes wallet with zero balance", async () => {
        const res = await request(app).get("/api/wallet").set("Cookie", cookie);
        if (res.status !== 200) throw new Error(`Expected 200 got ${res.status} ${JSON.stringify(res.body)}`);
        if (Number(res.body.data?.balance) !== 0) throw new Error(`Expected balance 0 got ${res.body.data?.balance}`);
        if (Number(res.body.data?.locked_balance) !== 0) throw new Error(`Expected locked 0 got ${res.body.data?.locked_balance}`);
    });

    await test("POST /api/wallet/deposit rejects non-positive amount", async () => {
        const res = await request(app).post("/api/wallet/deposit").set("Cookie", cookie).send({ amount: -50 });
        if (res.status !== 400) throw new Error(`Expected 400 got ${res.status} ${JSON.stringify(res.body)}`);
        if (res.body.error?.code !== "INVALID_AMOUNT") throw new Error(`Expected INVALID_AMOUNT, got ${res.body.error?.code}`);
    });

    await test("POST /api/wallet/deposit adds funds to balance", async () => {
        const res = await request(app).post("/api/wallet/deposit").set("Cookie", cookie).send({ amount: 500 });
        if (res.status !== 200) throw new Error(`Expected 200 got ${res.status} ${JSON.stringify(res.body)}`);
        if (Number(res.body.data?.balance) !== 500) throw new Error(`Expected 500 got ${res.body.data?.balance}`);
    });

    await test("GET /api/wallet/ledger records deposit entry", async () => {
        const res = await request(app).get("/api/wallet/ledger").set("Cookie", cookie);
        if (res.status !== 200) throw new Error(`Expected 200 got ${res.status} ${JSON.stringify(res.body)}`);
        if (!Array.isArray(res.body.data) || res.body.data.length === 0) throw new Error("Expected ledger entries array");
        const entry = res.body.data[0];
        if (entry.entry_type !== "deposit" || Number(entry.amount) !== 500) {
            throw new Error(`Unexpected entry: ${JSON.stringify(entry)}`);
        }
    });

    await test("GET /api/wallet/debts returns empty list when no debts", async () => {
        const res = await request(app).get("/api/wallet/debts").set("Cookie", cookie);
        if (res.status !== 200) throw new Error(`Expected 200 got ${res.status} ${JSON.stringify(res.body)}`);
        if (!Array.isArray(res.body.data) || res.body.data.length !== 0) {
            throw new Error(`Expected empty debts array, got: ${JSON.stringify(res.body.data)}`);
        }
    });
} finally {
    if (uid) try { await firebaseAuth.deleteUser(uid); } catch (e) { console.error(e); }
    await pool.end();
    console.log("\nWallet tests completed.\n");
}
