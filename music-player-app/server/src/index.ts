import { app } from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.serverPort, () => {
  console.log(`Server listening on http://localhost:${env.serverPort}`);
  console.log(`Music root: ${env.musicRoot}`);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`Received ${signal}. Closing server...`);
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
