import { Router } from "express";

import { getAdminSession, loginAdmin } from "../controllers/adminController.js";

export const adminRoutes = Router();

adminRoutes.post("/admin/login", loginAdmin);
adminRoutes.get("/admin/me", getAdminSession);
