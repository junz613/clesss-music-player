import { PrismaClient } from "@prisma/client";

import { env } from "../config/env.js";

// Prisma Client 在创建时读取 DATABASE_URL；这里确保它先拿到统一配置后的值。
process.env.DATABASE_URL = env.databaseUrl;

export const prisma = new PrismaClient();
