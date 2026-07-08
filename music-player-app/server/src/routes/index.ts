import { Router } from "express";

import { favoriteRoutes } from "./favoriteRoutes.js";
import { healthRoutes } from "./healthRoutes.js";
import { songRoutes } from "./songRoutes.js";

export const apiRoutes = Router();

// 路由入口只做组合，不放业务逻辑，后续模块继续在这里挂载。
apiRoutes.use(healthRoutes);
apiRoutes.use(songRoutes);
apiRoutes.use(favoriteRoutes);
