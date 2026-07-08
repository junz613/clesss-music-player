import { Router } from "express";
import multer from "multer";

import { getAdminSession, loginAdmin } from "../controllers/adminController.js";
import { deleteAdminSong, listAdminSongs, uploadAdminSong } from "../controllers/adminSongController.js";
import { requireAdmin } from "../middlewares/adminAuth.js";

export const adminRoutes = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

adminRoutes.post("/admin/login", loginAdmin);
adminRoutes.get("/admin/me", getAdminSession);
adminRoutes.get("/admin/songs", requireAdmin, listAdminSongs);
adminRoutes.post("/admin/songs", requireAdmin, upload.single("file"), uploadAdminSong);
adminRoutes.delete("/admin/songs/:id", requireAdmin, deleteAdminSong);
