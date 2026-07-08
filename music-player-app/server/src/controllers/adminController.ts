import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { createAdminToken, verifyAdminPassword, verifyAdminToken } from "../services/adminToken.js";

export async function loginAdmin(request: Request, response: Response, next: NextFunction) {
  try {
    const password = typeof request.body.password === "string" ? request.body.password : "";

    if (!env.adminPassword) {
      response.status(503).json({ message: "Admin password is not configured" });
      return;
    }

    if (!password || !verifyAdminPassword(password)) {
      response.status(401).json({ message: "Invalid admin password" });
      return;
    }

    const { token, session } = createAdminToken();

    response.json({
      data: {
        token,
        role: session.role,
        expiresAt: new Date(session.expiresAt * 1000).toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminSession(request: Request, response: Response, next: NextFunction) {
  try {
    const token = readBearerToken(request);
    const session = token ? verifyAdminToken(token) : null;

    if (!session) {
      response.status(401).json({ message: "Admin session is invalid or expired" });
      return;
    }

    response.json({
      data: {
        role: session.role,
        expiresAt: new Date(session.expiresAt * 1000).toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
}

function readBearerToken(request: Request) {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return "";
  }

  return header.slice("Bearer ".length).trim();
}
