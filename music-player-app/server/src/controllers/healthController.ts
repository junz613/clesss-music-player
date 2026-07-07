import type { Request, Response } from "express";

import { env } from "../config/env.js";

export function getHealth(_request: Request, response: Response) {
  response.json({
    status: "ok",
    service: "clesss-music-player-server",
    environment: env.nodeEnv,
    timestamp: new Date().toISOString()
  });
}
