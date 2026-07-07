# Server

Express + TypeScript + Prisma + MySQL 后端服务目录。

当前已完成第三步：后端工程骨架、基础 TypeScript 配置、Express 应用入口、dotenv 环境变量读取和 `/api/health` 健康检查接口。

## 计划目录

```text
src/
  config/
    env.ts
  controllers/
    healthController.ts
  middlewares/
  routes/
    healthRoutes.ts
    index.ts
  services/
  utils/
  app.ts
  index.ts
prisma/
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
