import config from "../_shared/config.js";
import { armWatchdog } from "../_shared/watchdog.js";
import store from "../_shared/store.js";
import { createApp, startServer } from "../_shared/app-factory.js";
import { productRouter, categoriesRouter, searchRouter } from "./routes/products.js";
import socialRouter from "./routes/social.js";
import fittingRouter from "./routes/fitting.js";
import i18nRouter from "./routes/i18n.js";
import recommendRouter from "./routes/recommend.js";
import adminProductsRouter from "./routes/admin-products.js";
import internalRouter from "./routes/internal.js";

export async function boot() {
  armWatchdog();
  await store.init();
  const app = createApp({
    routers: [
      { prefix: "/products", router: productRouter },
      { prefix: "/categories", router: categoriesRouter },
      { prefix: "/search", router: searchRouter },
      { prefix: "", router: socialRouter },
      { prefix: "/fitting", router: fittingRouter },
      { prefix: "", router: i18nRouter },
      { prefix: "/recommendations", router: recommendRouter },
      { prefix: "/admin", router: adminProductsRouter },
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
