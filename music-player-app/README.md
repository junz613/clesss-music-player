# music-player-app

这是 ClessS Music Player 的应用代码目录。

完整项目说明、当前进度、环境配置和启动方式见仓库根目录的 [README.md](../README.md)。

## 目录

```text
client/   前端 Vue 3 + Vite + TypeScript 项目
server/   后端 Express + TypeScript + Prisma + MySQL 项目
docs/     后续接口、数据库和部署补充文档目录
```

当前应用已打通本地歌曲列表、搜索、播放、播放队列、歌曲库分类、收藏页和管理员登录后台入口。

## 常用命令

```powershell
pnpm install
pnpm server:dev
pnpm client:dev
pnpm build
pnpm server:build
pnpm client:build
pnpm server:start
```

开发时通常需要分别启动后端和前端：

```powershell
pnpm server:dev
pnpm client:dev
```

前端地址：`http://localhost:5173`

后端地址：`http://localhost:3000`

服务器部署前准备见：[docs/deployment-prep.md](docs/deployment-prep.md)。
