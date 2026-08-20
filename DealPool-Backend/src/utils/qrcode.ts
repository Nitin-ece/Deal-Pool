import crypto from "crypto";
import { badRequest } from "./errors";

export type HandoffPurpose = "checkout" | "return";

const TOKEN_TTL_MS = 15 * 60 * 1000;

const getSecret = (): string =>
    process.env.CONTRACT_TOKEN_SECRET ||
    process.env.FIREBASE_PRIVATE_KEY ||
    "dev-handoff-secret-change-in-production";

export const generateHandoffToken = (
    contractId: string,
    purpose: HandoffPurpose
): { token: string; expiresAt: Date } => {
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    const payload = `${contractId}:${purpose}:${expiresAt.getTime()}`;
    const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
    const token = `${sig}.${Buffer.from(payload).toString("base64url")}`;
    return { token, expiresAt };
};

export const verifyHandoffToken = (
    token: string | undefined,
    contractId: string,
    purpose: HandoffPurpose
): void => {
    if (!token) {
        throw badRequest("Handoff token is required", "MISSING_HANDOFF_TOKEN");
    }

    const dotIndex = token.indexOf(".");
    if (dotIndex <= 0) {
        throw badRequest("Invalid handoff token", "INVALID_HANDOFF_TOKEN");
    }

    const sig = token.slice(0, dotIndex);
    const payloadB64 = token.slice(dotIndex + 1);
    const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
    const expectedSig = crypto
        .createHmac("sha256", getSecret())
        .update(payload)
        .digest("base64url");

    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (
        sigBuf.length !== expectedBuf.length ||
        !crypto.timingSafeEqual(sigBuf, expectedBuf)
    ) {
        throw badRequest("Invalid handoff token", "INVALID_HANDOFF_TOKEN");
    }

    const [tokenContractId, tokenPurpose, expiryStr] = payload.split(":");
    if (tokenContractId !== contractId || tokenPurpose !== purpose) {
        throw badRequest("Invalid handoff token for this operation", "INVALID_HANDOFF_TOKEN");
    }

    if (Date.now() > Number(expiryStr)) {
        throw badRequest("Handoff token has expired", "EXPIRED_HANDOFF_TOKEN");
    }
};
