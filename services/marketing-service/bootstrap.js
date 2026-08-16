import config from "../_shared/config.js";
import { armWatchdog } from "../_shared/watchdog.js";
import store from "../_shared/store.js";
import { createApp, startServer } from "../_shared/app-factory.js";
import marketingRouter from "./routes/marketing.js";
import pointsRouter from "./routes/points.js";
import grouponsRouter from "./routes/groupons.js";
import internalRouter from "./routes/internal.js";
import { startGrouponSweeper, stopGrouponSweeper } from "./sweeper.js";

export async function boot() {
  armWatchdog();
  await store.init();
  startGrouponSweeper();
  const app = createApp({
    routers: [
      { prefix: "", router: marketingRouter },
      { prefix: "", router: pointsRouter },
      { prefix: "", router: grouponsRouter },
    ],
    internalRouters: [{ prefix: "", router: internalRouter }],
  });
  startServer(app, config.port);
}

process.on("SIGTERM", async () => {
  stopGrouponSweeper();
  try { if (store.close) await store.close(); } catch {}
  process.exit(0);
});
process.on("SIGINT", async () => {
  try { if (store.close) await store.close(); } catch {}
  process.exit(0);
});