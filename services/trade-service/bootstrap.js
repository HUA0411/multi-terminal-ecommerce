import config from "../_shared/config.js";
import { armWatchdog } from "../_shared/watchdog.js";
import store from "../_shared/store.js";
import { createApp, startServer } from "../_shared/app-factory.js";
import ordersRouter from "./routes/orders.js";
import paymentsRouter from "./routes/payments.js";
import aftersalesRouter from "./routes/aftersales.js";
import adminOrdersRouter from "./routes/admin-orders.js";
import internalRouter from "./routes/internal.js";
import { startOrderSweeper, stopOrderSweeper } from "./sweeper.js";

export async function boot() {
  armWatchdog();
  await store.init();
  startOrderSweeper();
  const app = createApp({
    routers: [
      { prefix: "/orders", router: ordersRouter },
      { prefix: "/payments", router: paymentsRouter },
      { prefix: "/aftersales", router: aftersalesRouter },
      { prefix: "/admin", router: adminOrdersRouter },
    ],
    internalRouters: [{ prefix: "", router: internalRouter }],
  });
  startServer(app, config.port);
}

process.on("SIGTERM", async () => {
  stopOrderSweeper();
  try { if (store.close) await store.close(); } catch {}
  process.exit(0);
});
process.on("SIGINT", async () => {
  stopOrderSweeper();
  try { if (store.close) await store.close(); } catch {}
  process.exit(0);
});
