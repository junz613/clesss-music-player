import type { ErrorRequestHandler } from "express";

import { env } from "../config/env.js";

// 统一兜底未处理异常；开发环境返回 detail，生产环境避免泄露内部错误。
export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);

  response.status(500).json({
    message: "Internal server error",
    ...(env.nodeEnv === "development" && error instanceof Error ? { detail: error.message } : {})
  });
};
