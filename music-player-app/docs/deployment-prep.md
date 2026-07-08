# ClessS Music Player 部署前准备

本文档用于第二阶段真正部署到服务器前的准备。当前分支只做部署前整理，不直接包含服务器账号、真实密码、真实域名或歌曲文件。

## 推荐部署形态

第一版服务器部署建议保持前后端分离：

```text
Internet
  |
  v
Nginx / Caddy
  |-- /              -> client/dist 静态文件
  |-- /api           -> Express server:3000
  |
  v
MySQL

MUSIC_ROOT -> 服务器磁盘、挂载盘或后续对象存储同步目录
```

短期最稳妥方案：

- 前端：`client/dist` 由 Nginx 静态托管。
- 后端：Express 使用 PM2 或 systemd 守护。
- 数据库：优先使用云数据库或服务器 MySQL。
- 歌曲：先放服务器磁盘目录，例如 `/srv/clesss/music`；后续再迁移对象存储。

## 服务器准备清单

需要提前确认：

- 服务器系统与架构，例如 Ubuntu 22.04 LTS。
- Node.js 版本，建议使用当前 LTS。
- pnpm 安装方式。
- MySQL 连接方式：本机 MySQL、云数据库或 Docker MySQL。
- 歌曲目录最终路径，例如 `/srv/clesss/music`。
- 上传歌曲目录权限，运行后端的系统用户需要可写 `MUSIC_ROOT`。
- 域名、HTTPS 证书和反向代理规则。
- 进程守护方式：PM2、systemd 或 Docker。
- 数据备份：MySQL 备份、歌曲目录备份、上传目录备份。

## 生产环境变量

从仓库根目录模板复制：

```bash
cp .env.production.example .env
```

必须修改：

- `CLIENT_ORIGIN`：正式前端域名，例如 `https://music.example.com`。
- `DATABASE_URL`：正式 MySQL 连接串。
- `MUSIC_ROOT`：正式歌曲目录。
- `ADMIN_PASSWORD`：管理员密码。
- `ADMIN_TOKEN_SECRET`：足够长的随机字符串。

不要把真实 `.env` 提交到 Git。

## 首次部署流程草案

在服务器上拉取代码：

```bash
git clone https://github.com/junz613/clesss-music-player.git
cd clesss-music-player/music-player-app
pnpm install
```

初始化数据库：

```bash
pnpm prisma:generate
pnpm prisma:push
```

构建：

```bash
pnpm build
```

准备歌曲目录并扫描：

```bash
mkdir -p /srv/clesss/music
pnpm songs:scan
```

启动后端：

```bash
pnpm server:start
```

正式环境建议用 PM2 或 systemd 执行 `pnpm server:start`，不要长期依赖手动终端。

## Nginx 反向代理示例

以下仅作为结构参考，正式部署时需要替换域名、证书路径和项目路径。

```nginx
server {
    listen 80;
    server_name music.example.com;

    root /srv/clesss/app/music-player-app/client/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 上线前验证

服务器上完成部署后至少检查：

- `GET /api/health` 返回 `ok`。
- 前端首页可以打开。
- 歌曲列表可以加载。
- 任意歌曲可以播放、暂停、拖动进度。
- 管理员可以登录。
- 管理员可以上传测试 MP3。
- 管理员可以软删除测试歌曲，普通列表不再展示。
- 刷新页面后播放、收藏和歌曲库入口不出现明显错误。

## 风险与后续改造

- 当前管理员密码是单密码模式，公网部署后应尽快改为正式账号体系或至少加入更强访问控制。
- 当前歌曲流接口通过后端读取本地文件，公网大流量时需要评估带宽和磁盘 IO。
- 当前收藏是第一阶段单用户模型，后续多用户需要新增用户表和鉴权。
- 当前软删除不会物理删除文件，长期运行需要后台恢复、彻底删除和审计能力。
- 如果歌曲迁移到对象存储，需要改造 `Song` 的存储字段、上传逻辑和播放 URL 生成策略。
