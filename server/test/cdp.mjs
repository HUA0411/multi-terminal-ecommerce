// 极简 CDP 客户端：驱动本地 Chrome(9222) 做页面导航/DOM 查询/截图
// 用法: node cdp.mjs open <url> | eval <js> | text <selector> | html <selector> | shot <file> | click <selector> | setview <w> <h> | wait <ms>
import { WebSocket } from "ws";

const CDP = "http://127.0.0.1:9222";
let ws = null;
let msgId = 0;
const pending = new Map();

async function connect() {
  if (ws) return;
  const list = await (await fetch(CDP + "/json/list")).json();
  let page = list.find((t) => t.type === "page");
  if (!page) {
    const created = await (await fetch(CDP + "/json/new?about:blank", { method: "PUT" })).json();
    page = created;
  }
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });
  ws.on("message", (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  await send("Page.enable");
  await send("Runtime.enable");
  globalThis.__logs = [];
  ws.on("message", (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.method === "Runtime.consoleAPICalled") {
      const txt = (m.params.args || []).map((a) => a.value !== undefined ? a.value : a.description || "").join(" ");
      globalThis.__logs.push("[console." + m.params.type + "] " + txt);
    }
    if (m.method === "Log.entryAdded") {
      globalThis.__logs.push("[log." + m.params.entry.level + "] " + m.params.entry.text);
    }
    if (m.method === "Runtime.exceptionThrown") {
      globalThis.__logs.push("[exception] " + JSON.stringify(m.params.exceptionDetails).slice(0, 400));
    }
  });
  try { await send("Log.enable"); } catch {}
  try { await send("Network.enable"); } catch {}
  ws.on("message", (raw2) => {
    const m = JSON.parse(raw2.toString());
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400) {
      globalThis.__logs.push("[net." + m.params.response.status + "] " + m.params.response.url);
    }
  });
}

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, (m) => (m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression, awaitPromise = true) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error("JS error: " + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result ? r.result.value : undefined;
}

async function navigate(url) {
  await send("Page.navigate", { url });
  await sleep(1500);
  // wait for load
  for (let i = 0; i < 30; i++) {
    const ready = await evaluate("document.readyState");
    if (ready === "complete") break;
    await sleep(400);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(file) {
  const r = await send("Page.captureScreenshot", { format: "png" });
  const fs = await import("node:fs");
  fs.writeFileSync(file, Buffer.from(r.data, "base64"));
  console.log("shot saved:", file);
}

const [,, cmd, ...args] = process.argv;
await connect();
switch (cmd) {
  case "reload":
    await send("Page.reload", { ignoreCache: true });
    await sleep(2500);
    console.log("reloaded:", await evaluate("location.href"));
    break;
  case "open":
    await navigate(args[0]);
    console.log("url:", await evaluate("location.href"));
    break;
  case "eval":
    console.log(JSON.stringify(await evaluate(args.join(" ")), null, 1));
    break;
  case "text":
    console.log(JSON.stringify(await evaluate(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(args[0] || "body")})]; return els.slice(0, 5).map(e => (e.innerText || e.textContent || "").trim().slice(0, 200)); })()`)));
    break;
  case "html":
    console.log((await evaluate(`document.querySelector(${JSON.stringify(args[0])})?.outerHTML?.slice(0, 2000) || "NOT FOUND"`)));
    break;
  case "click":
    console.log(await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(args[0])}); if (!el) return "NOT FOUND"; el.scrollIntoView({block:"center"}); el.click(); return "clicked"; })()`));
    break;
  case "shot":
    await shot(args[0]);
    break;
  case "reloadLog": {
    await send("Page.reload", { ignoreCache: true });
    await sleep(4500);
    console.log(JSON.stringify({ logs: globalThis.__logs || [], body: (await evaluate("document.body.innerText.slice(0, 200)")) }, null, 1));
    break;
  }
  case "load": {
    await navigate(args[0]);
    await sleep(2500);
    console.log(JSON.stringify({ logs: globalThis.__logs || [], url: await evaluate("location.href") }, null, 1));
    break;
  }
  case "logs":
    console.log(JSON.stringify(globalThis.__logs || [], null, 1));
    break;
  case "setview":
    await send("Emulation.setDeviceMetricsOverride", { width: Number(args[0]) || 1440, height: Number(args[1]) || 900, deviceScaleFactor: 1, mobile: false });
    console.log("viewport set");
    break;
  case "file": {
    const fs2 = await import("node:fs");
    const js = fs2.readFileSync(args[0], "utf8");
    const out = await evaluate(js);
    console.log(JSON.stringify(out, null, 1));
    break;
  }
  case "evalLog": {
    const fs2 = await import("node:fs");
    const js = fs2.readFileSync(args[0], "utf8");
    const out = await evaluate(js);
    console.log(JSON.stringify({ out, logs: globalThis.__logs || [] }, null, 1));
    break;
  }
  case "wait":
    await sleep(Number(args[0]) || 1000);
    console.log("waited");
    break;
  case "form":
    // form <selector> <fieldSelector> <value> ... 简化：直接设置 input value + 触发 input 事件
    console.log(await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(args[0])}); if (!el) return "NOT FOUND"; const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(args[1])}); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return "filled"; })()`));
    break;
  default:
    console.log("unknown cmd", cmd);
}
process.exit(0);