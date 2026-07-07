# ClessS 本地音乐播放器

这是一个前后端分离的本地音乐播放器项目，第一阶段目标是在本机读取当前目录中的 MP3 文件并提供可搜索、可播放、可收藏、可管理的播放器体验；第二阶段再迁移到云端部署和云端文件存储。

## 当前状态

- 已完成技术规划文档：[播放器技术文档.md](播放器技术文档.md)
- 已初始化 Git 仓库。
- 已创建应用目录：`music-player-app`
- 已准备 `.gitignore` 和 `.env.example`
- 已完成后端健康检查、MySQL 数据模型、本地歌曲扫描脚本、歌曲列表、歌曲搜索和支持 Range 的音频流接口。
- 数据库方案已调整为 MySQL。

## 目录说明

```text
D:\ClessS
  music-player-app/
    client/
    server/
    docs/
  播放器技术文档.md
  .env.example
  .gitignore
  README.md
```

当前已有的 `ClessS 21上`、`ClessS 21下`、`ClessS古早` 等音乐文件夹会作为本地音乐库来源。普通 Git 提交默认忽略音频文件和这些音乐文件夹，避免仓库体积过大。

## 环境变量

复制 `.env.example` 为 `.env` 后，根据本机 MySQL 配置修改：

```text
DATABASE_URL="mysql://root:your-password@127.0.0.1:3306/clesss_music_player"
MUSIC_ROOT="D:\\ClessS"
```

## 下一步

下一步进入第六步：搭建前端基础项目，创建 Vue 3 + Vite + TypeScript 播放器界面骨架。
