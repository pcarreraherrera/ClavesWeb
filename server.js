const http = require("http");
const path = require("path");
const fs = require("fs");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Archivo no encontrado");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function handleLogin(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 1e6) req.socket.destroy();
  });
  req.on("end", () => {
    let parsed = {};
    try {
      parsed = JSON.parse(body || "{}");
    } catch (_) {
      return sendJson(res, 400, { error: "JSON inválido" });
    }
    const { email, password } = parsed;
    if (!email || !password) {
      return sendJson(res, 400, { error: "Faltan credenciales" });
    }
    return sendJson(res, 200, { message: "Login OK (mock)", email });
  });
}

function requestListener(req, res) {
  if (req.method === "POST" && req.url === "/login") {
    return handleLogin(req, res);
  }

  const safePath = path.normalize(req.url.split("?")[0]).replace(/^\/+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath || "index.html");
  const resolved = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()
    ? path.join(filePath, "index.html")
    : filePath;

  serveFile(res, resolved);
}

http.createServer(requestListener).listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
