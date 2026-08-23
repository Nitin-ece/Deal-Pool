/**
 * Discovery API tests — verifies the needs/offers classification logic.
 * Regression test for the bug where category==="Offer" was checked
 * against a schema that has no such category value.
 */
import dotenv from "dotenv";
import path from "path";
import request from "supertest";
import pool from "../src/config/db";
import { firebaseAuth } from "../src/config/firebase";
import { createCleanupTracker, cleanupTestData } from "./helpers/cleanup";
import { TEST_PASSWORD, TEST_COORDS, TEST_RADIUS_KM, testEmail } from "./helpers/fixtures";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { default: app } = await import("../src/app");

const tracker = createCleanupTracker();

const dealCreatorEmail = testEmail("discovery-creator");
const offerMakerEmail = testEmail("discovery-offerer");

let creatorCookie: string;
let offererCookie: string;
let createdDealId: string;

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
  // --- Setup: Create two users ---
  await test("Setup: Register deal creator", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: dealCreatorEmail, password: TEST_PASSWORD });
    if (res.status !== 201) throw new Error(`Expected 201 got ${res.status} ${JSON.stringify(res.body)}`);
    creatorCookie = getCookie(getCookies(res), "accessToken");
    const user = await firebaseAuth.getUserByEmail(dealCreatorEmail);
    tracker.firebaseUids.push(user.uid);
    if (res.body.data?.id) tracker.profileIds.push(res.body.data.id);
  });

  await test("Setup: Register offer maker", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: offerMakerEmail, password: TEST_PASSWORD });
    if (res.status !== 201) throw new Error(`Expected 201 got ${res.status} ${JSON.stringify(res.body)}`);
    offererCookie = getCookie(getCookies(res), "accessToken");
    const user = await firebaseAuth.getUserByEmail(offerMakerEmail);
    tracker.firebaseUids.push(user.uid);
    if (res.body.data?.id) tracker.profileIds.push(res.body.data.id);
  });

  // --- Create a deal (initially a "need" — no offers yet) ---
  await test("POST /api/deals creates a deal", async () => {
    const res = await request(app)
      .post("/api/deals")
      .set("Cookie", creatorCookie)
      .send({
        title: "Discovery Test Deal",
        description: "A deal to test discovery classification",
        category: "Service",
        lat: TEST_COORDS.lat,
        lng: TEST_COORDS.lng,
        radiusKm: TEST_RADIUS_KM,
      });
    if (res.status !== 201) throw new Error(`Expected 201 got ${res.status} ${JSON.stringify(res.body)}`);
    createdDealId = res.body.data?.id;
    if (!createdDealId) throw new Error("No deal id returned");
    tracker.dealIds.push(createdDealId);
  });

  // --- Verify deal starts as a "need" (no offers) ---
  await test("GET /api/discovery/nearby shows deal in 'needs' (no offers yet)", async () => {
    const res = await request(app).get(
      `/api/discovery/nearby?lat=${TEST_COORDS.lat}&lng=${TEST_COORDS.lng}&radiusKm=${TEST_RADIUS_KM}`
    );
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status}`);

    const data = res.body.data;
    const inNeeds = data.needs.some((d: any) => d.id === createdDealId);
    const inOffers = data.offers.some((d: any) => d.id === createdDealId);

    if (!inNeeds) throw new Error(`Deal ${createdDealId} not found in needs array`);
    if (inOffers) throw new Error(`Deal ${createdDealId} should NOT be in offers array yet`);
  });

  // --- Create an offer against the deal ---
  await test("POST /api/deals/:dealId/offers creates an offer on the deal", async () => {
    const res = await request(app)
      .post(`/api/deals/${createdDealId}/offers`)
      .set("Cookie", offererCookie)
      .send({
        price: 50,
        terms: "I can help with this service",
      });
    if (res.status !== 201) throw new Error(`Expected 201 got ${res.status} ${JSON.stringify(res.body)}`);
    if (res.body.data?.id) tracker.offerIds.push(res.body.data.id);
  });

  // --- Verify deal now appears in "offers" (has a pending offer) ---
  await test("GET /api/discovery/nearby shows deal in 'offers' after offer made", async () => {
    const res = await request(app).get(
      `/api/discovery/nearby?lat=${TEST_COORDS.lat}&lng=${TEST_COORDS.lng}&radiusKm=${TEST_RADIUS_KM}`
    );
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status}`);

    const data = res.body.data;
    const inNeeds = data.needs.some((d: any) => d.id === createdDealId);
    const inOffers = data.offers.some((d: any) => d.id === createdDealId);

    if (inNeeds) throw new Error(`Deal ${createdDealId} should NOT be in needs after offer`);
    if (!inOffers) throw new Error(`Deal ${createdDealId} not found in offers array after offer made`);
  });
} finally {
  await cleanupTestData(tracker);
  await pool.end();
  console.log("\nDiscovery tests completed.\n");
}
