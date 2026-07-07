import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { apiRoutes } from "./routes/index.js";

// createApp 只负责组装 Express 实例，便于以后做测试或多环境启动。
export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  // 前端开发服务器独立运行，接口需要显式允许跨域和凭据。
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // 所有业务接口统一挂在 /api 下，前端和代理配置会更清晰。
  app.use("/api", apiRoutes);

  // 404 必须放在业务路由后面，避免吞掉正常接口。
  app.use((_request, response) => {
    response.status(404).json({
      message: "Route not found"
    });
  });
  // 错误处理中间件最后注册，集中输出开发环境错误细节。
  app.use(errorHandler);

  return app;
}

export const app = createApp();
