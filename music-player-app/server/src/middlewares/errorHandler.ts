import type { ErrorRequestHandler } from "express";

import { env } from "../config/env.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);

  response.status(500).json({
    message: "Internal server error",
    ...(env.nodeEnv === "development" && error instanceof Error ? { detail: error.message } : {})
  });
};
