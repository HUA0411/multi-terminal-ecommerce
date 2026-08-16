import config from "../_shared/config.js";
import { armWatchdog } from "../_shared/watchdog.js";
import store from "../_shared/store.js";
import { createApp, startServer } from "../_shared/app-factory.js";
import { merchantRouter, merchantAdminRouter } from "./routes/merchants.js";
import quotesRouter from "./routes/quotes.js";
import b2bCustomersRouter from "./routes/b2b-customers.js";
import internalRouter from "./routes/internal.js";

export async function boot() {
  armWatchdog();
  await store.init();
  const app = createApp({
    routers: [
      { prefix: "/merchants", router: merchantRouter },
      { prefix: "/admin/merchants", router: merchantAdminRouter },
      { prefix: "", router: quotesRouter },
      { prefix: "/admin", router: b2bCustomersRouter },
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
