import crypto from "node:crypto";

import { env } from "../config/env.js";

export type AdminSession = {
  role: "admin";
  issuedAt: number;
  expiresAt: number;
};

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export function createAdminToken(now = Math.floor(Date.now() / 1000)) {
  const session: AdminSession = {
    role: "admin",
    issuedAt: now,
    expiresAt: now + TOKEN_TTL_SECONDS
  };
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const signature = signPayload(payload);

  return {
    token: `${payload}.${signature}`,
    session
  };
}

export function verifyAdminToken(token: string): AdminSession | null {
  const [payload, signature] = token.split(".");

  if (!payload || !signature || !safeEqual(signature, signPayload(payload))) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    const now = Math.floor(Date.now() / 1000);

    if (session.role !== "admin" || !Number.isFinite(session.expiresAt) || session.expiresAt <= now) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function verifyAdminPassword(password: string) {
  if (!env.adminPassword) {
    return false;
  }

  return safeEqual(hash(password), hash(env.adminPassword));
}

function signPayload(payload: string) {
  return crypto.createHmac("sha256", env.adminTokenSecret).update(payload).digest("base64url");
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
