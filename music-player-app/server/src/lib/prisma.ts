import { PrismaClient } from "@prisma/client";

import { env } from "../config/env.js";

process.env.DATABASE_URL = env.databaseUrl;

export const prisma = new PrismaClient();
