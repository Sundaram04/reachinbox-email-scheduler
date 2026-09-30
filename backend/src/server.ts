import app from "./app";
import { env } from "./config/env";
import { closeDb, pingDb } from "./db";

async function main() {
  await pingDb();

  const server = app.listen(env.PORT, () => {
    console.log(
      `API server running on http://localhost:${env.PORT} (${env.NODE_ENV})`,
    );
  });

  function shutdown(signal: string) {
    console.log(`${signal} received, shutting down...`);

    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
