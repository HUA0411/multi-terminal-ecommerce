import config from "../_shared/config.js";
import { armWatchdog } from "../_shared/watchdog.js";
import store from "../_shared/store.js";
import { createApp, startServer } from "../_shared/app-factory.js";
import { registerInternal } from "../_shared/internal-client.js";
import authRouter from "./routes/auth.js";
import addressesRouter from "./routes/addresses.js";
import adminUsersRouter from "./routes/admin-users.js";
import internalRouter from "./routes/internal.js";

export async function boot() {
  armWatchdog();
  await store.init();
  registerInternal("GET", "/internal/users/:id", async ({ params }) => {
    const u = store.get("users", params.id);
    return u ? publicUserOf(u) : null;
  });
  const app = createApp({
    routers: [
      { prefix: "/auth", router: authRouter },
      { prefix: "/addresses", router: addressesRouter },
      { prefix: "/admin", router: adminUsersRouter },
    ],
    internalRouters: [{ prefix: "", router: internalRouter }],
  });
  startServer(app, config.port);
}

import { publicUser } from "../_shared/util.js";
function publicUserOf(u) { return publicUser(u); }

process.on("SIGTERM", async () => {
  try { if (store.close) await store.close(); } catch {}
  process.exit(0);
});
process.on("SIGINT", async () => {
  try { if (store.close) await store.close(); } catch {}
  process.exit(0);
});
