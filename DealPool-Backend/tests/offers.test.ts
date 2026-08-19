import dotenv from "dotenv";
import path from "path";
import request from "supertest";
import pool from "../src/config/db";
import { firebaseAuth } from "../src/config/firebase";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { default: app } = await import("../src/app");

const emailA = `offers-a-${Date.now()}@example.com`;
const emailB = `offers-b-${Date.now()}@example.com`;
const password = "TestPassword123!";

let cookieA: string;
let cookieB: string;
let uidA: string | undefined;
let uidB: string | undefined;

let acceptResourceId: string;
let acceptDealId: string;
let acceptOfferId: string;

let rejectResourceId: string;
let rejectDealId: string;
let rejectOfferId: string;

let withdrawResourceId: string;
let withdrawDealId: string;
let withdrawOfferId: string;

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
  await test("register user A and user B", async () => {
    const r1 = await request(app).post("/api/auth/register").send({ email: emailA, password });
    if (r1.status !== 201) throw new Error(`Expected 201 got ${r1.status} ${JSON.stringify(r1.body)}`);
    cookieA = getCookie(getCookies(r1), "accessToken");
    uidA = (await firebaseAuth.getUserByEmail(emailA)).uid;

    const r2 = await request(app).post("/api/auth/register").send({ email: emailB, password });
    if (r2.status !== 201) throw new Error(`Expected 201 got ${r2.status} ${JSON.stringify(r2.body)}`);
    cookieB = getCookie(getCookies(r2), "accessToken");
    uidB = (await firebaseAuth.getUserByEmail(emailB)).uid;
  });

  await test("A cannot offer on their own deal", async () => {
    const resRes = await request(app).post("/api/resources").set("Cookie", cookieA).send({
      title: "Self Offer Item",
      declaredValue: 200,
      lat: 37.1,
      lng: -122.0,
    });
    const resourceId = resRes.body.data?.id;

    const dealRes = await request(app).post("/api/deals").set("Cookie", cookieA).send({
      title: "Self Offer Deal",
      resourceId,
      lat: 37.1,
      lng: -122.0,
    });
    if (dealRes.status !== 201) throw new Error(`Expected 201 got ${dealRes.status}`);
    const dealId = dealRes.body.data?.id;

    const res = await request(app).post(`/api/deals/${dealId}/offers`).set("Cookie", cookieA).send({ price: 10, terms: "self offer" });
    if (res.status !== 400) throw new Error(`Expected 400 got ${res.status} ${JSON.stringify(res.body)}`);
    if (res.body.error?.code !== "CANNOT_OFFER_OWN_DEAL") throw new Error(`Expected CANNOT_OFFER_OWN_DEAL got ${res.body.error?.code}`);
  });

  await test("setup deal + offer for accept flow", async () => {
    const resRes = await request(app).post("/api/resources").set("Cookie", cookieA).send({
      title: "Accept Flow Item",
      declaredValue: 300,
      lat: 37.2,
      lng: -122.1,
    });
    acceptResourceId = resRes.body.data?.id;

    const dealRes = await request(app).post("/api/deals").set("Cookie", cookieA).send({
      title: "Accept Flow Deal",
      resourceId: acceptResourceId,
      lat: 37.2,
      lng: -122.1,
    });
    if (dealRes.status !== 201) throw new Error(`Expected 201 got ${dealRes.status}`);
    acceptDealId = dealRes.body.data?.id;

    const offerRes = await request(app).post(`/api/deals/${acceptDealId}/offers`).set("Cookie", cookieB).send({ price: 25, terms: "will accept" });
    if (offerRes.status !== 201) throw new Error(`Expected 201 got ${offerRes.status} ${JSON.stringify(offerRes.body)}`);
    acceptOfferId = offerRes.body.data?.id;
  });

  await test("GET /api/deals/:dealId/offers lists the offer", async () => {
    const res = await request(app).get(`/api/deals/${acceptDealId}/offers`);
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status}`);
    if (!Array.isArray(res.body.data) || !res.body.data.some((o: any) => o.id === acceptOfferId)) {
      throw new Error("Offer not found in deal offers list");
    }
  });

  await test("non-owner cannot accept offer", async () => {
    const res = await request(app).patch(`/api/offers/${acceptOfferId}/accept`).set("Cookie", cookieB);
    if (res.status !== 403) throw new Error(`Expected 403 got ${res.status} ${JSON.stringify(res.body)}`);
  });

  await test("A (deal owner) accepts B's offer", async () => {
    const res = await request(app).patch(`/api/offers/${acceptOfferId}/accept`).set("Cookie", cookieA);
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status} ${JSON.stringify(res.body)}`);
    if (res.body.data?.status !== "accepted") throw new Error(`Expected status accepted got ${res.body.data?.status}`);
  });

  await test("accepted offer cannot be accepted again", async () => {
    const res = await request(app).patch(`/api/offers/${acceptOfferId}/accept`).set("Cookie", cookieA);
    if (res.status !== 409) throw new Error(`Expected 409 got ${res.status} ${JSON.stringify(res.body)}`);
    if (res.body.error?.code !== "OFFER_NOT_PENDING") throw new Error(`Expected OFFER_NOT_PENDING got ${res.body.error?.code}`);
  });

  await test("setup deal + offer for reject flow", async () => {
    const resRes = await request(app).post("/api/resources").set("Cookie", cookieA).send({
      title: "Reject Flow Item",
      declaredValue: 200,
      lat: 37.3,
      lng: -122.2,
    });
    rejectResourceId = resRes.body.data?.id;

    const dealRes = await request(app).post("/api/deals").set("Cookie", cookieA).send({
      title: "Reject Flow Deal",
      resourceId: rejectResourceId,
      lat: 37.3,
      lng: -122.2,
    });
    if (dealRes.status !== 201) throw new Error(`Expected 201 got ${dealRes.status}`);
    rejectDealId = dealRes.body.data?.id;

    const offerRes = await request(app).post(`/api/deals/${rejectDealId}/offers`).set("Cookie", cookieB).send({ price: 15, terms: "will be rejected" });
    if (offerRes.status !== 201) throw new Error(`Expected 201 got ${offerRes.status}`);
    rejectOfferId = offerRes.body.data?.id;
  });

  await test("A (deal owner) rejects B's offer", async () => {
    const res = await request(app).patch(`/api/offers/${rejectOfferId}/reject`).set("Cookie", cookieA);
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status} ${JSON.stringify(res.body)}`);
    if (res.body.data?.status !== "rejected") throw new Error(`Expected status rejected got ${res.body.data?.status}`);
  });

  await test("setup deal + offer for withdraw flow", async () => {
    const resRes = await request(app).post("/api/resources").set("Cookie", cookieA).send({
      title: "Withdraw Flow Item",
      declaredValue: 200,
      lat: 37.4,
      lng: -122.3,
    });
    withdrawResourceId = resRes.body.data?.id;

    const dealRes = await request(app).post("/api/deals").set("Cookie", cookieA).send({
      title: "Withdraw Flow Deal",
      resourceId: withdrawResourceId,
      lat: 37.4,
      lng: -122.3,
    });
    if (dealRes.status !== 201) throw new Error(`Expected 201 got ${dealRes.status}`);
    withdrawDealId = dealRes.body.data?.id;

    const offerRes = await request(app).post(`/api/deals/${withdrawDealId}/offers`).set("Cookie", cookieB).send({ price: 12, terms: "will withdraw" });
    if (offerRes.status !== 201) throw new Error(`Expected 201 got ${offerRes.status}`);
    withdrawOfferId = offerRes.body.data?.id;
  });

  await test("non-provider cannot withdraw offer", async () => {
    const res = await request(app).patch(`/api/offers/${withdrawOfferId}/withdraw`).set("Cookie", cookieA);
    if (res.status !== 403) throw new Error(`Expected 403 got ${res.status}`);
  });

  await test("B (provider) withdraws own offer", async () => {
    const res = await request(app).patch(`/api/offers/${withdrawOfferId}/withdraw`).set("Cookie", cookieB);
    if (res.status !== 200) throw new Error(`Expected 200 got ${res.status} ${JSON.stringify(res.body)}`);
    if (res.body.data?.status !== "withdrawn") throw new Error(`Expected status withdrawn got ${res.body.data?.status}`);
  });

  await test("FEE_EXCEEDS_CAP on a price above 10% of declared value", async () => {
    // Create resource with declared_value: 1000 (10% cap is 100)
    const resResource = await request(app)
      .post("/api/resources")
      .set("Cookie", cookieA)
      .send({
        title: "High Value Generator",
        declaredValue: 1000,
        lat: 37.5,
        lng: -122.4,
      });
    if (resResource.status !== 201) throw new Error(`Expected 201 got ${resResource.status}`);
    const resourceId = resResource.body.data?.id;

    // Create deal linked to resource
    const resDeal = await request(app)
      .post("/api/deals")
      .set("Cookie", cookieA)
      .send({
        title: "Need Generator for Event",
        resourceId,
        lat: 37.5,
        lng: -122.4,
      });
    if (resDeal.status !== 201) throw new Error(`Expected 201 got ${resDeal.status}`);
    const cappedDealId = resDeal.body.data?.id;

    // Attempt offer of 150 (exceeds 100)
    const badOffer = await request(app)
      .post(`/api/deals/${cappedDealId}/offers`)
      .set("Cookie", cookieB)
      .send({ price: 150, terms: "Exorbitant fee" });
    if (badOffer.status !== 400) throw new Error(`Expected 400 got ${badOffer.status} ${JSON.stringify(badOffer.body)}`);
    if (badOffer.body.error?.code !== "FEE_EXCEEDS_CAP") {
      throw new Error(`Expected FEE_EXCEEDS_CAP error code, got: ${badOffer.body.error?.code}`);
    }

    // Valid offer under cap (e.g. 90)
    const goodOffer = await request(app)
      .post(`/api/deals/${cappedDealId}/offers`)
      .set("Cookie", cookieB)
      .send({ price: 90, terms: "Fair fee under cap" });
    if (goodOffer.status !== 201) throw new Error(`Expected 201 got ${goodOffer.status} ${JSON.stringify(goodOffer.body)}`);
  });
} finally {
  if (uidA) try { await firebaseAuth.deleteUser(uidA); } catch (e) { console.error(e); }
  if (uidB) try { await firebaseAuth.deleteUser(uidB); } catch (e) { console.error(e); }
  await pool.end();
  console.log("\nOffers tests completed.\n");
}