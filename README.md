# ClessS Music Player

ClessS Music Player 是一个前后端分离的本地音乐播放器。第一阶段目标是在本机稳定读取本地歌曲文件，提供搜索、播放、切歌、收藏、歌曲库分类和管理员歌曲管理能力；第二阶段再迁移到云服务器、云数据库和云端歌曲存储。

当前仓库只保存项目代码、文档和必要配置模板，不保存歌曲文件、数据库数据、`.env`、`node_modules`、构建产物或其他大体积本地文件。

## 阶段状态

第一阶段本地 Demo 已基本完成。

已实现：

- 用户侧歌曲搜索、播放、暂停、上一首、下一首。
- 播放队列：点击歌曲后自动从当前歌曲起生成后续队列，队列上限 500 首。
- 播放模式：列表循环、单曲循环、随机播放。
- 播放进度条、音量调节、播放详情页、黑胶唱片旋转效果。
- 歌曲库：按本地文件夹分类展示，例如 `ClessS 21上`、`ClessS 21下`。
- 收藏页：收藏、取消收藏、查看收藏列表、收藏列表播放全部。
- 管理员登录：顶部登录入口进入管理员后台。
- 管理员新增歌曲：上传 `.mp3`，可加入已有歌单或新建歌单。
- 管理员删除歌曲：支持搜索、按歌单筛选并软删除；软删除后普通列表、搜索、收藏页和播放入口不再展示。
- 本地 MySQL 数据建模、本地歌曲扫描、Range 音频流播放。

第 12 步本地联调检查结果：

- `pnpm client:build` 通过。
- `pnpm server:build` 通过。
- `GET /api/health` 返回 `ok`。
- `GET /api/songs?page=1&pageSize=1` 可返回歌曲数据。
- 管理员登录和 `GET /api/admin/songs` 可正常访问。

待后续阶段处理：

- 云服务器部署、域名、HTTPS、进程守护和反向代理。
- 云数据库、云端歌曲存储或对象存储迁移。
- 更正式的用户系统与权限模型。
- 管理员批量操作、软删除恢复、审计日志等后台增强。
- 移动端完整适配和桌面端封装评估。

## 技术栈

前端：

- Vue 3
- Vite
- TypeScript
- Pinia
- Axios
- lucide-vue-next

后端：

- Node.js
- Express
- TypeScript
- Prisma
- MySQL
- music-metadata
- multer

开发与协作：

- pnpm
- Git
- VS Code

## 系统架构

```text
Browser
  |
  |  Vite dev proxy or production reverse proxy
  v
Vue Client  <---- /api ---->  Express API  <---->  MySQL
                                  |
                                  v
                           MUSIC_ROOT local songs
```

第一阶段歌曲文件保存在本地 `MUSIC_ROOT` 下，后端扫描本地目录并把歌曲元数据写入 MySQL。音频播放时，前端请求后端 `stream` 接口，后端按 Range 返回本地 MP3 文件流。

## 目录结构

```text
D:\ClessS
  music-player-app/
    client/                 前端 Vue 3 应用
    server/                 后端 Express 应用
    docs/                   接口、部署、迁移等补充文档
    package.json            前后端统一脚本入口
  ClessS 21上/              本地歌曲目录，未提交 Git
  ClessS 21下/              本地歌曲目录，未提交 Git
  ClessS 22上/              本地歌曲目录，未提交 Git
  ...
  .env.example              本地环境变量模板
  .gitignore
  README.md
  播放器技术文档.md
```

## 环境变量

复制 `.env.example` 为 `.env`，根据本机 MySQL 和歌曲目录修改。

```powershell
Copy-Item .env.example .env
```

| 变量 | 说明 | 本地默认 |
| --- | --- | --- |
| `NODE_ENV` | 运行环境 | `development` |
| `CLIENT_PORT` | 前端开发端口 | `5173` |
| `SERVER_PORT` | 后端服务端口 | `3000` |
| `CLIENT_ORIGIN` | 允许访问 API 的前端源 | `http://localhost:5173` |
| `MYSQL_HOST` | MySQL 主机 | `127.0.0.1` |
| `MYSQL_PORT` | MySQL 端口 | `3306` |
| `MYSQL_USER` | MySQL 用户 | `root` |
| `MYSQL_PASSWORD` | MySQL 密码 | 需自行填写 |
| `MYSQL_DATABASE` | MySQL 数据库名 | `clesss_music_player` |
| `DATABASE_URL` | Prisma 数据库连接串 | 可直接覆盖 `MYSQL_*` |
| `MUSIC_ROOT` | 本地歌曲根目录 | `D:\ClessS` |
| `UPLOAD_FOLDER` | 默认上传歌单名 | `ClessS 本地上传` |
| `ADMIN_PASSWORD` | 管理员密码 | 需自行填写 |
| `ADMIN_TOKEN_SECRET` | 管理员 token 签名密钥 | 需自行填写 |

后端按以下顺序读取环境变量，越靠前优先级越高：

1. `music-player-app/server/.env`
2. `music-player-app/.env`
3. 仓库根目录 `.env`

## 本地启动

准备条件：

- Node.js
- pnpm
- MySQL
- 本地歌曲文件夹

进入应用目录并安装依赖：

```powershell
cd D:\ClessS\music-player-app
pnpm install
```

创建数据库：

```sql
CREATE DATABASE clesss_music_player CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

初始化 Prisma：

```powershell
cd D:\ClessS\music-player-app\server
pnpm prisma:generate
pnpm prisma:push
```

扫描本地歌曲：

```powershell
cd D:\ClessS\music-player-app\server
pnpm songs:scan
```

启动后端：

```powershell
cd D:\ClessS\music-player-app
pnpm server:dev
```

启动前端：

```powershell
cd D:\ClessS\music-player-app
pnpm client:dev
```

浏览器访问：

```text
http://localhost:5173
```

关闭服务时，在对应终端按 `Ctrl + C`。如果终端询问是否终止批处理，输入 `Y` 后回车。

## 构建与运行

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

生产环境建议将 `client/dist` 作为静态站点交给 Nginx、Caddy 或平台静态托管服务，并把 `/api` 反向代理到后端 Express 服务。

## 主要接口

公开接口：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/health` | 健康检查 |
| `GET` | `/api/songs?page=&pageSize=&folder=` | 歌曲列表 |
| `GET` | `/api/songs/search?keyword=&page=&pageSize=` | 歌曲搜索 |
| `GET` | `/api/songs/:id/stream` | 音频流，支持 Range |
| `GET` | `/api/favorites` | 收藏列表 |
| `POST` | `/api/favorites/:songId` | 添加收藏 |
| `DELETE` | `/api/favorites/:songId` | 取消收藏 |

管理员接口：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/admin/login` | 管理员登录 |
| `GET` | `/api/admin/me` | 校验管理员会话 |
| `GET` | `/api/admin/songs?page=&pageSize=&keyword=&folder=` | 管理端歌曲列表 |
| `POST` | `/api/admin/songs` | 上传 `.mp3` 歌曲 |
| `DELETE` | `/api/admin/songs/:id` | 软删除歌曲 |

管理员接口除登录外均需要请求头：

```text
Authorization: Bearer <admin-token>
```

## 数据与文件策略

- `songs` 表保存歌曲元数据和本地文件路径。
- `favorites` 表保存第一阶段单用户收藏数据。
- 管理员删除歌曲采用软删除，只更新 `isDeleted = true`，不物理删除 MP3。
- 本地扫描不会自动恢复管理员软删除的歌曲，避免删除后又被重新显示。
- 上传歌曲写入 `MUSIC_ROOT/<folder>`，并同步写入数据库。
- 当前播放接口只支持本地文件；云端阶段需要替换为对象存储或云文件地址。

## Git 约定

提交前建议执行：

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
- 本地数据库导出或运行数据

当前 GitHub 仓库：

```text
https://github.com/junz613/clesss-music-player
```

## 部署前检查清单

进入服务器部署分支前，需要确认：

- 已确定服务器系统、Node.js 版本、pnpm 安装方式。
- 已确定 MySQL 部署方式：同机 MySQL、云数据库或 Docker MySQL。
- 已确定歌曲存储方式：服务器磁盘、挂载盘、对象存储或后续云存储。
- 已准备生产环境 `DATABASE_URL`、`MUSIC_ROOT`、`CLIENT_ORIGIN`、`ADMIN_PASSWORD`、`ADMIN_TOKEN_SECRET`。
- 已确定前端静态文件托管方式和 `/api` 反向代理规则。
- 已确定后端进程守护方式：PM2、systemd、Docker 或云平台运行时。
- 已确定备份方案：MySQL 备份、歌曲文件备份、上传目录备份。

## 当前限制

- 这是本地开发版，不是公网正式产品。
- 其他人从 GitHub 拉取后只能获得代码，不能获得你的歌曲、`.env` 或 MySQL 数据。
- 如果他人需要本地运行，需要自行配置 MySQL、准备歌曲文件夹并执行扫描。
- 当前约 5000 首歌曲可用；如果未来数量明显增加，歌曲列表应改为虚拟滚动或服务端分页浏览。
- 移动端只有基础响应式处理，暂不作为第一阶段重点。
