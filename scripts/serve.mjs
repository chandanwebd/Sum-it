// Local preview server that resolves URLs the way GitHub Pages does in production:
//   /privacy        → privacy.html
//   /blog/          → blog/index.html
//   /blog           → redirect to /blog/
// VS Code Live Server does not do this, so links such as /privacy 404 there.
//
//   node scripts/serve.mjs [port]      (default 5173)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "../..");
const port = Number(process.argv[2]) || 5173;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2",
};

const isFile = async (p) => { try { return (await stat(p)).isFile(); } catch { return false; } };
const isDir = async (p) => { try { return (await stat(p)).isDirectory(); } catch { return false; } };

async function resolve(urlPath) {
  const rel = normalize(decodeURIComponent(urlPath)).replace(/^([\\/])+/, "");
  if (rel.startsWith("..")) return null;
  const base = join(root, rel);
  if (urlPath.endsWith("/")) return (await isFile(join(base, "index.html"))) ? { file: join(base, "index.html") } : null;
  if (await isFile(base)) return { file: base };
  if (await isFile(base + ".html")) return { file: base + ".html" };
  if (await isDir(base) && await isFile(join(base, "index.html"))) return { redirect: urlPath + "/" };
  return null;
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    const hit = await resolve(url.pathname);
    if (hit && hit.redirect) { res.writeHead(301, { Location: hit.redirect + url.search }); return res.end(); }
    if (hit) {
      res.writeHead(200, { "Content-Type": TYPES[extname(hit.file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
      return res.end(await readFile(hit.file));
    }
    const notFound = join(root, "404.html");
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end((await isFile(notFound)) ? await readFile(notFound) : "<h1>404</h1>");
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server error: " + e.message);
  }
}).listen(port, () => console.log(`Sum-IT preview: http://localhost:${port}/  (clean URLs like GitHub Pages)`));
