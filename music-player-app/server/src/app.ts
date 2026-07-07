import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { apiRoutes } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", apiRoutes);

  app.use((_request, response) => {
    response.status(404).json({
      message: "Route not found"
    });
  });

  return app;
}

export const app = createApp();
