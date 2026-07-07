import { Router } from "express";

import { listSongs, searchSongs, streamSong } from "../controllers/songController.js";

export const songRoutes = Router();

// 搜索路由必须放在 :id 路由之前，否则 "search" 会被当成歌曲 id。
songRoutes.get("/songs", listSongs);
songRoutes.get("/songs/search", searchSongs);
songRoutes.get("/songs/:id/stream", streamSong);
