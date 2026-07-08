import type { Request, RequestHandler } from "express";

import { verifyAdminToken } from "../services/adminToken.js";

export const requireAdmin: RequestHandler = (request, response, next) => {
  const token = readBearerToken(request);
  const session = token ? verifyAdminToken(token) : null;

  if (!session) {
    response.status(401).json({ message: "Admin session is invalid or expired" });
    return;
  }

  next();
};

export function readBearerToken(request: Request) {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return "";
  }

  return header.slice("Bearer ".length).trim();
}
