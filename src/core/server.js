/**
 * Servidor Express para health checks
 */

import express from "express";

export class WebServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.setupRoutes();
  }

  setupRoutes() {
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
          health: '/health'
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
