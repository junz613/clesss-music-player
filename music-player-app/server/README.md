# Server

Express + TypeScript + Prisma + MySQL 后端服务目录。

当前已完成第五步：后端工程骨架、基础 TypeScript 配置、Express 应用入口、dotenv 环境变量读取、`/api/health` 健康检查接口、本地歌曲扫描服务、歌曲列表接口、歌曲搜索接口和支持 Range 的音频流接口。

## 计划目录

```text
src/
  config/
    env.ts
  controllers/
    healthController.ts
    songController.ts
  lib/
    prisma.ts
  middlewares/
    errorHandler.ts
  routes/
    healthRoutes.ts
    index.ts
    songRoutes.ts
  scripts/
    scanSongs.ts
  services/
    audioStream.ts
    songScanner.ts
    songPresenter.ts
  utils/
  app.ts
  index.ts
prisma/
  schema.prisma
scripts/
  setup-local-mysql.ps1
```

## 启动方式

依赖安装后可使用：

```bash
pnpm dev
```

启动后访问：

```http
GET http://localhost:3000/api/health
```

歌曲列表接口：

```http
GET http://localhost:3000/api/songs
```

歌曲搜索接口：

```http
GET http://localhost:3000/api/songs/search?keyword=晴天
```

音频流接口：

```http
GET http://localhost:3000/api/songs/:id/stream
```

音频流接口支持 `Range` 请求，浏览器播放器可以拖动进度条。

## 本地 MySQL 与歌曲扫描

如果还没有配置本地 `.env`，在可见的 VS Code PowerShell 终端执行：

```powershell
.\music-player-app\server\scripts\setup-local-mysql.ps1
```

脚本会提示输入 MySQL 密码，然后创建 `clesss_music_player` 数据库，并写入仓库根目录 `.env` 和 `server/.env`。`.env` 已被 `.gitignore` 忽略，不会提交到 GitHub。

建库和 `.env` 完成后执行：

```powershell
cd D:\ClessS\music-player-app
pnpm --dir server prisma:push
pnpm --dir server songs:scan
```
