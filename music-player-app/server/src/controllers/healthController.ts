import type { Request, Response } from "express";

import { env } from "../config/env.js";

// 健康检查只暴露服务状态，不触发数据库或文件系统依赖。
export function getHealth(_request: Request, response: Response) {
  response.json({
    status: "ok",
    service: "clesss-music-player-server",
    environment: env.nodeEnv,
    timestamp: new Date().toISOString()
  });
}
