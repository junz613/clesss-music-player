import { Router } from "express";

import { addFavorite, listFavorites, removeFavorite } from "../controllers/favoriteController.js";

export const favoriteRoutes = Router();

favoriteRoutes.get("/favorites", listFavorites);
favoriteRoutes.post("/favorites/:songId", addFavorite);
favoriteRoutes.delete("/favorites/:songId", removeFavorite);
