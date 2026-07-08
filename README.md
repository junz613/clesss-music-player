# ClessS Music Player

ClessS Music Player 是一个前后端分离的本地音乐播放器项目。第一阶段目标是在本机读取本地歌曲文件，提供可搜索、可播放、可切歌、可查看播放列表的播放器 Demo；后续阶段会继续补齐收藏、管理后台，并迁移到云端部署和云端歌曲存储。

当前仓库只保存项目代码和必要配置模板，不保存歌曲文件、数据库内容、`.env`、`node_modules`、构建产物等本地或大体积文件。

## 当前进度

已完成：

- 技术规划文档：[播放器技术文档.md](播放器技术文档.md)
- Git 仓库初始化，并已推送到 GitHub 私有仓库。
- 后端基础服务：Express + TypeScript + Prisma + MySQL。
- 后端接口：健康检查、歌曲列表、歌曲搜索、按 Range 返回音频流。
- 本地歌曲扫描：从 `MUSIC_ROOT` 下的歌曲文件夹扫描音频文件并写入 MySQL。
- 前端基础工程：Vue 3 + Vite + TypeScript + Pinia。
- 首页 UI：白底、红色按钮元素、左侧导航、歌曲列表、播放条。
- 播放功能：播放、暂停、上一首、下一首、结束后自动切歌、进度显示、点击进度条跳转。
- 播放队列：点击歌曲后自动从当前歌曲开始生成后续播放列表，播放队列上限为 500 首。
- 播放模式：列表循环、单曲循环、随机播放。
- 音量控制。
- 搜索：搜索歌曲、文件夹或歌手；点击“首页”可回到主页。
- 播放全部：可将当前列表最多 500 首加入播放队列。
- 歌曲库：按本地文件夹分类展示，例如 `ClessS 21上`、`ClessS 21下`、`ClessS古早`，进入分类后可播放该分类歌曲。
- README 和代码注释已进行基础整理。

待完成：

- 收藏和取消收藏，以及收藏列表页面。
- 管理员新增歌曲、删除歌曲。
- 更完整的错误提示、加载态和空状态。
- 更正式的接口文档。
- 生产部署方案：云服务器、云数据库、云端对象存储或文件存储。
- 桌面端封装方案评估，例如 Electron、Tauri 或 PWA。
- 移动端完整适配。目前只有基础响应式样式，暂不作为重点。

## 技术栈

前端：

- Vue 3
- Vite
- TypeScript
- Pinia
- lucide-vue-next
- Axios

后端：

- Node.js
- Express
- TypeScript
- Prisma
- MySQL
- music-metadata

本地开发工具：

- pnpm
- Git
- VS Code

## 目录结构

```text
D:\ClessS
  music-player-app/
    client/                 前端 Vue 项目
    server/                 后端 Express 项目
    docs/                   后续接口、部署等补充文档目录
    package.json            前后端统一脚本入口
  ClessS 21上/              本地歌曲目录，未提交到 Git
  ClessS 21下/              本地歌曲目录，未提交到 Git
  ClessS 22上/              本地歌曲目录，未提交到 Git
  ...
  .env.example              环境变量模板
  .gitignore
  README.md
  播放器技术文档.md
```

## 本地运行前提

需要先准备：

- Node.js
- pnpm
- MySQL
- 本地歌曲文件夹

当前开发环境约定：

- 前端地址：`http://localhost:5173`
- 后端地址：`http://localhost:3000`
- 数据库：MySQL
- 歌曲根目录：默认使用仓库根目录 `D:\ClessS`

## 环境变量

复制 `.env.example` 为 `.env`，并根据本机 MySQL 配置修改：

```powershell
Copy-Item .env.example .env
```

关键配置示例：

```env
NODE_ENV=development

CLIENT_PORT=5173
SERVER_PORT=3000
CLIENT_ORIGIN=http://localhost:5173

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=change-this-password
MYSQL_DATABASE=clesss_music_player
DATABASE_URL="mysql://root:change-this-password@127.0.0.1:3306/clesss_music_player"

MUSIC_ROOT="D:\\ClessS"
UPLOAD_FOLDER="ClessS 本地上传"

ADMIN_PASSWORD=change-this-admin-password
ADMIN_TOKEN_SECRET=change-this-token-secret
```

后端会按以下顺序读取环境变量：

1. `music-player-app/server/.env`
2. `music-player-app/.env`
3. 仓库根目录 `.env`

目前本地开发通常使用仓库根目录的 `.env` 即可。

## 安装依赖

进入应用目录：

```powershell
cd D:\ClessS\music-player-app
```

安装依赖：

```powershell
pnpm install
```

## 初始化数据库

确保 MySQL 已启动，并且 `.env` 中的数据库账号密码正确。

进入后端目录执行 Prisma：

```powershell
cd D:\ClessS\music-player-app\server
pnpm prisma:generate
pnpm prisma:push
```

如果数据库不存在，需要先在 MySQL 中创建：

```sql
CREATE DATABASE clesss_music_player CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 扫描本地歌曲

扫描 `MUSIC_ROOT` 下的本地歌曲文件并写入数据库：

```powershell
cd D:\ClessS\music-player-app\server
pnpm songs:scan
```

当前已验证本地库约有 4856 首歌曲。首页和搜索结果会分批加载完整歌曲列表；播放队列仍限制为最多 500 首，避免一次性把过多歌曲塞入播放器状态。

## 启动开发服务

开发时建议打开两个终端。

终端一，启动后端：

```powershell
cd D:\ClessS\music-player-app
pnpm server:dev
```

终端二，启动前端：

```powershell
cd D:\ClessS\music-player-app
pnpm client:dev
```

浏览器打开：

```text
http://localhost:5173
```

关闭服务时，在对应终端按：

```text
Ctrl + C
```

如果终端询问是否终止批处理，输入 `Y` 后回车。

## 构建检查

前端构建：

```powershell
cd D:\ClessS\music-player-app
pnpm client:build
```

后端构建：

```powershell
cd D:\ClessS\music-player-app
pnpm server:build
```

运行构建后的后端：

```powershell
cd D:\ClessS\music-player-app
pnpm server:build
pnpm --dir server start
```

## 常用接口

健康检查：

```text
GET http://localhost:3000/api/health
```

歌曲列表：

```text
GET http://localhost:3000/api/songs?page=1&pageSize=500
```

歌曲搜索：

```text
GET http://localhost:3000/api/songs/search?keyword=关键词&page=1&pageSize=500
```

音频播放：

```text
GET http://localhost:3000/api/songs/:id/stream
```

音频流接口支持 `Range` 请求，浏览器音频播放、拖动进度条会依赖这个能力。

## 当前使用限制

- 这是本地开发版，不是公网可访问的正式产品。
- 其他人从 GitHub 拉取仓库后，只能获得代码，不能获得你的本地歌曲、`.env`、MySQL 数据库内容。
- 其他人若要本地运行，需要自行配置 MySQL、准备歌曲文件夹、运行扫描脚本。
- 真正的多人访问和跨设备访问，需要等后续云端部署、云端数据库和云端歌曲存储完成。
- 当前歌曲列表直接渲染完整列表。约 5000 首歌曲阶段可以先使用；如果数量继续增长或出现明显卡顿，后续应改为虚拟滚动。

## Git 约定

建议提交代码前执行：

```powershell
cd D:\ClessS\music-player-app
pnpm client:build
pnpm server:build
```

不要提交：

- `.env`
- `node_modules`
- `dist`
- 本地歌曲文件夹
- 大体积音频文件

## 下一步计划

推荐下一步继续做收藏功能：

1. 后端补齐收藏接口。
2. 前端歌曲列表爱心按钮接入收藏和取消收藏。
3. 左侧“收藏”入口显示收藏歌曲列表。
4. 收藏列表支持播放全部。
5. 构建验证后提交并推送到 GitHub。
