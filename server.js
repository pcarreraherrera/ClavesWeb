const http = require("http");
const path = require("path");
const fs = require("fs");
const sql = require("mssql");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

// Configuración de SQL Server (soporta auth SQL o integrada)
const authMode = (process.env.DB_AUTH || "sql").toLowerCase();
const baseConfig = {
  server: process.env.DB_SERVER || "localhost",
  port: Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || "Claves",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const dbConfig =
  authMode === "integrated"
    ? {
        ...baseConfig,
        authentication: {
          type: "ntlm",
          options: {
            userName: process.env.DB_USER || "",
            password: process.env.DB_PASSWORD || "",
            domain: process.env.DB_DOMAIN || undefined,
          },
        },
      }
    : {
        ...baseConfig,
        user: process.env.DB_USER || "Pruebas",
        password: process.env.DB_PASSWORD || "1234",
      };

let poolPromise;
async function getPool() {
  if (poolPromise) return poolPromise;

  // Si falla auth SQL, intentamos una conexión integrada con el usuario actual como respaldo
  const fallbackUser = process.env.DB_FALLBACK_USER || process.env.USERNAME || "";
  const fallbackDomain = process.env.DB_FALLBACK_DOMAIN || process.env.USERDOMAIN || undefined;

  const configs = [dbConfig];
  if (authMode !== "integrated" && fallbackUser) {
    configs.push({
      ...baseConfig,
      authentication: {
        type: "ntlm",
        options: {
          userName: fallbackUser,
          password: process.env.DB_FALLBACK_PASSWORD || "",
          domain: fallbackDomain,
        },
      },
    });
  }

  poolPromise = (async () => {
    let lastError;
    for (const cfg of configs) {
      try {
        return await sql.connect(cfg);
      } catch (err) {
        lastError = err;
        console.error("DB connect failed", err.message || err);
      }
    }
    throw lastError;
  })();

  return poolPromise;
}

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

async function handleLogin(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 1e6) req.socket.destroy();
  });

  req.on("end", async () => {
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

    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .input("email", sql.VarChar, email)
        .input("password", sql.VarChar, password)
        .query(
          "SELECT TOP 1 email, [Nombre], [Apellido] FROM Usuarios " +
            "WHERE email = @email AND [contraseña] = @password"
        );

      if (result.recordset.length === 0) {
        return sendJson(res, 401, { error: "Credenciales inválidas" });
      }

      const row = result.recordset[0];
      return sendJson(res, 200, {
        message: "Acceso concedido",
        email: row.email,
        nombre: row.Nombre,
        apellido: row.Apellido,
      });
    } catch (err) {
      console.error("DB error", err.message);
      return sendJson(res, 500, { error: "Error interno" });
    }
  });
}

async function handleCreateUser(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 1e6) req.socket.destroy();
  });

  req.on("end", async () => {
    let parsed = {};
    try {
      parsed = JSON.parse(body || "{}");
    } catch (_) {
      return sendJson(res, 400, { error: "JSON inválido" });
    }

    const { nombre, apellido, usuario, email, password, departamento, cargo } = parsed;
    if (!nombre || !apellido || !usuario || !email || !password || !departamento || !cargo) {
      return sendJson(res, 400, { error: "Faltan datos" });
    }

    try {
      const pool = await getPool();
      await pool
        .request()
        .input("nombre", sql.VarChar, nombre)
        .input("apellido", sql.VarChar, apellido)
        .input("usuario", sql.VarChar, usuario)
        .input("email", sql.VarChar, email)
        .input("password", sql.VarChar, password)
        .input("departamento", sql.VarChar, departamento)
        .input("cargo", sql.VarChar, cargo)
        .query(
          "INSERT INTO Usuarios ([Nombre], [Apellido], [Usuario], [email], [contraseña], [Departamento], [Cargo]) " +
            "VALUES (@nombre, @apellido, @usuario, @email, @password, @departamento, @cargo)"
        );

      return sendJson(res, 201, { message: "Usuario creado" });
    } catch (err) {
      console.error("DB error", err.message || err);
      const msg = (err.message || "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return sendJson(res, 409, { error: "Usuario o email ya existe" });
      }
      return sendJson(res, 500, { error: "Error interno" });
    }
  });
}

function requestListener(req, res) {
  if (req.method === "POST" && req.url === "/login") {
    return handleLogin(req, res);
  }

  if (req.method === "POST" && req.url === "/usuarios") {
    return handleCreateUser(req, res);
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
