import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "apps", "mobile", "dist", "build", "h5");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2" };
http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = path.join(root, urlPath === "/" ? "index.html" : urlPath);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "index.html");
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(5174, () => console.log("mobile H5 static server on :5174"));
