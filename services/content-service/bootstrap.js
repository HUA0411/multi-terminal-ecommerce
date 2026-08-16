import config from "../_shared/config.js";
import { armWatchdog } from "../_shared/watchdog.js";
import store from "../_shared/store.js";
import { createApp, startServer } from "../_shared/app-factory.js";
import { cmsPublicRouter, cmsAdminRouter } from "./routes/cms.js";
import liveRouter from "./routes/live.js";
import internalRouter from "./routes/internal.js";

export async function boot() {
  armWatchdog();
  await store.init();
  const app = createApp({
    routers: [
      { prefix: "/cms", router: cmsPublicRouter },
      { prefix: "/admin/cms", router: cmsAdminRouter },
      { prefix: "/live", router: liveRouter },
    ],
    internalRouters: [{ prefix: "", router: internalRouter }],
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
