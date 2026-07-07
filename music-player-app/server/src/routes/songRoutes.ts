import { Router } from "express";

import { listSongs } from "../controllers/songController.js";

export const songRoutes = Router();

songRoutes.get("/songs", listSongs);
