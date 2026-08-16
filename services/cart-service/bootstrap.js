import config from "../_shared/config.js";
import { armWatchdog } from "../_shared/watchdog.js";
import store from "../_shared/store.js";
import { createApp, startServer } from "../_shared/app-factory.js";
import cartRouter from "./routes/cart.js";
import internalRouter from "./routes/internal.js";

export async function boot() {
  armWatchdog();
  await store.init();
  const app = createApp({
    routers: [{ prefix: "/cart", router: cartRouter }],
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
