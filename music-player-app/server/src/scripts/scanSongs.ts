import { prisma } from "../lib/prisma.js";
import { scanLocalSongs } from "../services/songScanner.js";

try {
  const result = await scanLocalSongs();

  console.log("Local song scan completed.");
  console.table({
    musicRoot: result.musicRoot,
    scanned: result.scanned,
    created: result.created,
    updated: result.updated,
    restored: result.restored,
    softDeleted: result.softDeleted,
    failed: result.failed
  });

  if (result.failures.length > 0) {
    console.warn("Some files could not be scanned:");
    console.table(result.failures.slice(0, 20));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
