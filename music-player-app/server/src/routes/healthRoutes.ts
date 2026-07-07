import { Router } from "express";

import { getHealth } from "../controllers/healthController.js";

export const healthRoutes = Router();

// 保持路径短小稳定，方便部署平台和本地脚本探活。
healthRoutes.get("/health", getHealth);
