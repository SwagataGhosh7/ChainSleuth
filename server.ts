/**
 * Unified Full-Stack Server for ChainSleuth in Google AI Studio
 * Mounts Express /api routes alongside Vite middlewares on port 3000.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createApiRouter } from './backend/src/server.js';

import http from 'http';
import { wsService } from './backend/src/services/wsService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Mount backend API routes under /api
  app.use('/api', createApiRouter());

  // In development, hook up Vite dev server middlewares
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built dist directory
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Create HTTP server and mount WebSocket server
  const server = http.createServer(app);
  wsService.initialize(server);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🛡️ ChainSleuth Full-Stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
