# music-player-app

播放器应用代码目录。

当前进度：

- `server` 已完成 Express + TypeScript + Prisma + MySQL 基础服务。
- 已支持健康检查、歌曲列表、歌曲搜索、本地歌曲扫描入库和 Range 音频流。
- `client` 已完成 Vue 3 + Vite + TypeScript 基础界面，风格参考 `ui图片素材/2.png`。
- 已完成本地播放小 demo，支持播放/暂停、上一首/下一首、结束自动切歌和播放进度跳转。

目录结构：

```text
client/   前端 Vue 3 + Vite 项目
server/   后端 Express + TypeScript + Prisma 项目
docs/     接口、数据库和部署补充文档
```

本地启动：

```powershell
pnpm server:dev
pnpm client:dev
```
