import dotenv from "dotenv";
import path from "path";
import request from "supertest";
import pool from "../src/config/db";
import { firebaseAuth } from "../src/config/firebase";
import { createCleanupTracker, cleanupTestData } from "./helpers/cleanup";
import { TEST_PASSWORD, TEST_COORDS, testEmail } from "./helpers/fixtures";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { default: app } = await import("../src/app");

const email = testEmail("deals");
const tracker = createCleanupTracker();

let accessTokenCookie: string;
let createdDealId: string | undefined;

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
  await test("POST /api/auth/register creates a user", async () => {
    const res = await request(app).post("/api/auth/register").send({ email, password: TEST_PASSWORD });
    if (res.status !== 201) throw new Error(`Expected 201 got ${res.status} ${JSON.stringify(res.body)}`);

    const cookies = getCookies(res);
    accessTokenCookie = getCookie(cookies, "accessToken");

    const user = await firebaseAuth.getUserByEmail(email);
    tracker.firebaseUids.push(user.uid);
    if (res.body.data?.id) tracker.profileIds.push(res.body.data.id);
  });

  await test("POST /api/deals creates a deal", async () => {
    const payload = {
      title: "Test Deal",
      description: "A simple test deal",
      lat: TEST_COORDS.lat,
      lng: TEST_COORDS.lng,
      radiusKm: 5,
    };

    const res = await request(app).post("/api/deals").set("Cookie", accessTokenCookie).send(payload);
    if (res.status !== 201) throw new Error(`Expected 201 got ${res.status} ${JSON.stringify(res.body)}`);
    createdDealId = res.body.data?.id;
    if (!createdDealId) throw new Error("No deal id returned");
    tracker.dealIds.push(createdDealId);
  });

  await test("GET /api/deals/:id returns deal", async () => {
    const res = await request(app).get(`/api/deals/${createdDealId}`);
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status}`);
    if (res.body.data?.id !== createdDealId) throw new Error("Returned wrong deal id");
  });

  await test("GET /api/deals lists deals", async () => {
    const res = await request(app).get("/api/deals");
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status}`);
    if (!Array.isArray(res.body.data)) throw new Error("Expected array of deals");
  });

  await test("GET /api/deals/nearby returns nearby deals", async () => {
    const res = await request(app).get(`/api/deals/nearby?lat=${TEST_COORDS.lat}&lng=${TEST_COORDS.lng}&radiusKm=10`);
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status} ${JSON.stringify(res.body)}`);
    if (!Array.isArray(res.body.data)) throw new Error("Expected array of deals");
  });

  await test("PATCH /api/deals/:id updates deal as owner", async () => {
    const res = await request(app).patch(`/api/deals/${createdDealId}`).set("Cookie", accessTokenCookie).send({ title: "Updated Title" });
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status} ${JSON.stringify(res.body)}`);
    if (res.body.data?.title !== "Updated Title") throw new Error("Title was not updated");
  });

  await test("PATCH /api/deals/:id rejects non-owner", async () => {
    const res = await request(app).patch(`/api/deals/${createdDealId}`).send({ title: "Hacked Title" });
    if (res.status !== 401) throw new Error(`Expected 401 got ${res.status}`);
  });

  await test("DELETE /api/deals/:id deletes deal as owner", async () => {
    const res = await request(app).delete(`/api/deals/${createdDealId}`).set("Cookie", accessTokenCookie);
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status} ${JSON.stringify(res.body)}`);
    // Deal deleted via API, remove from tracker so cleanup doesn't try to delete it again
    tracker.dealIds = tracker.dealIds.filter((id) => id !== createdDealId);
  });
} finally {
  await cleanupTestData(tracker);
  await pool.end();
  console.log("\nDeals tests completed.\n");
}