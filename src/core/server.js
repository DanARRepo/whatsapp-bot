/**
 * Servidor Express para health checks
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const QR_DIR = path.join(__dirname, "../../qr");

export class WebServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.setupRoutes();
  }

  setupRoutes() {
    // Servir archivos estáticos del directorio QR
    this.app.use('/qr', express.static(QR_DIR));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({ 
        message: 'WhatsApp Bot API',
        status: 'running',
        endpoints: {
          health: '/health',
          qr: '/qr/qr.html',
          qrImage: '/qr/qr.png'
        }
      });
    });
  }

  /**
   * Inicia el servidor
   */
  start() {
    this.app.listen(this.port, () => {
      console.log(`Servidor activo en puerto ${this.port} 🚀`);
    });
  }
}
