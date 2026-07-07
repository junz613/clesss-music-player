import { Router } from "express";

import { listSongs, searchSongs, streamSong } from "../controllers/songController.js";

export const songRoutes = Router();

songRoutes.get("/songs", listSongs);
songRoutes.get("/songs/search", searchSongs);
songRoutes.get("/songs/:id/stream", streamSong);
