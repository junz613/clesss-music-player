import { Router } from "express";

import { healthRoutes } from "./healthRoutes.js";
import { songRoutes } from "./songRoutes.js";

export const apiRoutes = Router();

apiRoutes.use(healthRoutes);
apiRoutes.use(songRoutes);
