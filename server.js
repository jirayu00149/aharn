const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 10000);
const dataDir = process.env.DATA_DIR || path.join(root, "data");
const storeFile = path.join(dataDir, "store.json");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
};

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(storeFile, "utf8"));
  } catch (error) {
    return {};
  }
}

function writeStore(data) {
  fs.mkdirSync(dataDir, { recursive: true });
  const next = { ...data, updatedAt: new Date().toISOString() };
  delete next.session;
  fs.writeFileSync(storeFile, JSON.stringify(next, null, 2));
  return next;
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function collectBody(request, callback) {
  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
    if (body.length > 2_000_000) request.destroy();
  });
  request.on("end", () => callback(body));
}

function handleApi(request, response) {
  if (request.method === "GET") {
    sendJson(response, 200, readStore());
    return;
  }

  if (request.method === "POST" || request.method === "PUT") {
    collectBody(request, (body) => {
      try {
        const payload = body ? JSON.parse(body) : {};
        sendJson(response, 200, writeStore(payload));
      } catch (error) {
        sendJson(response, 400, { error: "Invalid JSON" });
      }
    });
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

function serveStatic(request, response, pathname) {
  const cleanPath = pathname === "/" ? "/admin.html" : pathname;
  let filePath = path.normalize(path.join(root, decodeURIComponent(cleanPath)));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    filePath = path.join(root, "404.html");
  }

  const ext = path.extname(filePath).toLowerCase();
  response.writeHead(filePath.endsWith("404.html") ? 404 : 200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300",
  });
  fs.createReadStream(filePath).pipe(response);
}

http
  .createServer((request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/api/state") {
      handleApi(request, response);
      return;
    }
    serveStatic(request, response, url.pathname);
  })
  .listen(port, () => {
    console.log(`Hiadee Noodle OS listening on ${port}`);
  });
