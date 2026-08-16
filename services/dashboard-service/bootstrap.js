import config from "../_shared/config.js";
import { armWatchdog } from "../_shared/watchdog.js";
import store from "../_shared/store.js";
import { createApp, startServer } from "../_shared/app-factory.js";
import dashboardRouter from "./routes/dashboard.js";

export async function boot() {
  armWatchdog();
  await store.init();
  const app = createApp({
    routers: [
      { prefix: "/admin/dashboard", router: dashboardRouter },
      { prefix: "/merchant/dashboard", router: dashboardRouter },
    ],
  });
  startServer(app, config.port);
}

process.on("SIGTERM", async () => {
  try { if (store.close) await store.close(); } catch {}
  process.exit(0);
});
process.on("SIGINT", async () => {
  try { if (store.close) await store.close(); } catch {}
  process.exit(0);
});
