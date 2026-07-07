import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const serverRoot = path.resolve(currentDir, "../..");
const appRoot = path.resolve(serverRoot, "..");
const workspaceRoot = path.resolve(appRoot, "..");

const envFiles = [
  path.join(serverRoot, ".env"),
  path.join(appRoot, ".env"),
  path.join(workspaceRoot, ".env")
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }
}

function readNumber(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.MYSQL_USER ?? "root";
  const password = process.env.MYSQL_PASSWORD ?? "";
  const host = process.env.MYSQL_HOST ?? "127.0.0.1";
  const port = process.env.MYSQL_PORT ?? "3306";
  const database = process.env.MYSQL_DATABASE ?? "clesss_music_player";

  return `mysql://${user}:${password}@${host}:${port}/${database}`;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  serverPort: readNumber("SERVER_PORT", 3000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  databaseUrl: buildDatabaseUrl(),
  musicRoot: process.env.MUSIC_ROOT ?? workspaceRoot,
  uploadFolder: process.env.UPLOAD_FOLDER ?? "ClessS 本地上传",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  adminTokenSecret: process.env.ADMIN_TOKEN_SECRET ?? "local-dev-secret"
};
