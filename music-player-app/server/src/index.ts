import { app } from "./app.js";
import { env } from "./config/env.js";

// index.ts 是唯一真正监听端口的入口；测试时可以直接复用 app.ts。
const server = app.listen(env.serverPort, () => {
  console.log(`Server listening on http://localhost:${env.serverPort}`);
  console.log(`Music root: ${env.musicRoot}`);
});

// 捕获终止信号，给 HTTP server 一个正常关闭的机会。
function shutdown(signal: NodeJS.Signals) {
  console.log(`Received ${signal}. Closing server...`);
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
