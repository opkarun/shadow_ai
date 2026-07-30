import express from "express";
import { request, createServer } from "http";
import { Socket } from "net";
import path from "path";
import { fileURLToPath } from "url";
import { registerDashboardRoutes } from "./apiRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3000");
const VITE_PORT = 5173;
const isDev = process.env.NODE_ENV !== "production";

const app = express();

// Middleware
app.use(express.json());

// API Routes (before any other routes)
registerDashboardRoutes(app);

// Development: proxy to separate Vite dev server
if (isDev) {
  // Proxy all non-API requests to the Vite dev server
  app.use((req, res) => {
    // Skip API routes - they're already handled above
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "Not found" });
    }

    const options = {
      hostname: "localhost",
      port: VITE_PORT,
      path: req.originalUrl,
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${VITE_PORT}`,
      },
    };

    const proxyReq = request(options, (proxyRes) => {
      // Pass through Vite's response headers
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on("error", (err) => {
      console.error(`Proxy error: ${err.message}`);
      res.status(503).json({
        error: "Vite dev server not available",
        message: "Make sure npm run dev:frontend is running on port 5173",
      });
    });

    // Pipe the request body to the proxy
    req.pipe(proxyReq);
  });
} else {
  // Production: serve static files
  const distPath = path.join(__dirname, "..", "dist", "dashboard");
  app.use(express.static(distPath, { index: false }));

  app.use("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const server = createServer(app);

// Handle WebSocket upgrade for Vite HMR in development
if (isDev) {
  server.on("upgrade", (req, socket, head) => {
    // Create a new socket connection to Vite
    const proxySocket = new Socket();

    proxySocket.on("connect", () => {
      // Build the HTTP request for the upgrade
      let requestLine = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
      let headers = "";

      for (const [key, value] of Object.entries(req.headers)) {
        if (key !== "connection" && key !== "upgrade") {
          headers += `${key}: ${Array.isArray(value) ? value.join(",") : value}\r\n`;
        }
      }

      headers += `host: localhost:${VITE_PORT}\r\n`;
      headers += "connection: upgrade\r\n";
      headers += "upgrade: websocket\r\n\r\n";

      proxySocket.write(requestLine + headers);
      if (head && head.length > 0) {
        proxySocket.write(head);
      }

      // Pipe data between client and Vite
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
    });

    proxySocket.on("error", (err) => {
      console.error(`WebSocket proxy connection error: ${err.message}`);
      socket.destroy();
    });

    // Connect to Vite dev server
    proxySocket.connect(VITE_PORT, "localhost");
  });
}

server.listen(PORT, () => {
  if (isDev) {
    console.log(`\n✓ Backend API running at http://localhost:${PORT}`);
    console.log(`✓ Frontend proxied from http://localhost:${VITE_PORT}`);
    console.log(`✓ Dashboard available at http://localhost:${PORT}`);
    console.log(`✓ HMR WebSocket proxied to http://localhost:${VITE_PORT}\n`);
  } else {
    console.log(`\n✓ Dashboard running at http://localhost:${PORT}\n`);
  }
});
