# ClessS 本地音乐播放器

这是一个前后端分离的本地音乐播放器项目，第一阶段目标是在本机读取当前目录中的 MP3 文件并提供可搜索、可播放、可收藏、可管理的播放器体验；第二阶段再迁移到云端部署和云端文件存储。

## 当前状态

- 已完成技术规划文档：[播放器技术文档.md](播放器技术文档.md)
- 已初始化 Git 仓库。
- 已创建应用目录：`music-player-app`
- 已准备 `.gitignore` 和 `.env.example`
- 已完成后端健康检查、MySQL 数据模型、本地歌曲扫描脚本、歌曲列表、歌曲搜索和支持 Range 的音频流接口。
- 已完成前端 Vue 3 + Vite + TypeScript 基础界面，左上使用 ClessS 图标和红色品牌字。
- 已打通前端真实播放小 demo：支持播放、暂停、上一首、下一首、结束自动切歌、播放进度显示和点击跳转。
- 已补足基础播放器业务逻辑：点击歌曲生成后续播放列表，支持列表循环、单曲循环、随机播放和音量调节。
- 首页和搜索页会分批加载完整歌曲列表；播放队列上限保持 500 首，并支持“播放全部”。
- 已实装歌曲库入口，可按本地文件夹分类浏览歌曲并对单个分类播放全部。
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

也可以运行后端提供的本地初始化脚本，它会提示输入 MySQL 密码并写入本地 `.env`：

```powershell
.\music-player-app\server\scripts\setup-local-mysql.ps1
```

## 下一步

下一步进入第八步：实现收藏和取消收藏功能，并让收藏列表可用。
