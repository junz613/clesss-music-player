import { prisma } from "../lib/prisma.js";
import { scanLocalSongs } from "../services/songScanner.js";

try {
  // 命令行扫描脚本复用服务层逻辑，方便手动重建或同步本地音乐库。
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
    // 文件较多时只展示前 20 个失败项，避免终端输出被刷屏。
    console.warn("Some files could not be scanned:");
    console.table(result.failures.slice(0, 20));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  // 脚本退出前主动断开 Prisma，避免 Node 进程挂起。
  await prisma.$disconnect();
}
