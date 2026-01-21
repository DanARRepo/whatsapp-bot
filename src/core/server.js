/**
 * Servidor Express para health checks y QR
 */

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import os from "os";

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

    // Ruta /qr que redirige a /qr/qr.html o sirve el HTML directamente
    this.app.get('/qr', (req, res) => {
      const qrHtmlPath = path.join(QR_DIR, "qr.html");
      if (fs.existsSync(qrHtmlPath)) {
        res.sendFile(qrHtmlPath);
      } else {
        res.status(404).json({ 
          error: 'QR no disponible aún. Espera a que se genere el código QR.' 
        });
      }
    });

    // Endpoint para obtener QR como imagen PNG (para curl)
    this.app.get('/api/qr', (req, res) => {
      const qrPath = path.join(QR_DIR, "qr.png");
      
      if (!fs.existsSync(qrPath)) {
        return res.status(404).json({ 
          error: 'QR no disponible aún. Espera a que se genere el código QR.' 
        });
      }
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(qrPath);
    });

    // Endpoint para obtener la URL del túnel de Cloudflare
    this.app.get('/api/tunnel-url', (req, res) => {
      const tunnelUrlPath = path.join(__dirname, "../../tunnel-url.txt");
      
      if (!fs.existsSync(tunnelUrlPath)) {
        return res.status(404).json({ 
          error: 'Túnel no activo. El túnel se crea automáticamente al iniciar el bot.',
          message: 'Espera unos segundos después de iniciar el bot para que el túnel se cree.'
        });
      }
      
      try {
        const tunnelUrl = fs.readFileSync(tunnelUrlPath, 'utf8').trim();
        const stats = fs.statSync(tunnelUrlPath);
        const ageMinutes = Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60));
        const remainingMinutes = Math.max(0, 120 - ageMinutes); // 2 horas = 120 minutos
        
        res.json({ 
          tunnelUrl: tunnelUrl,
          qrEndpoint: `${tunnelUrl}/qr`,
          createdAt: stats.mtime.toISOString(),
          ageMinutes: ageMinutes,
          remainingMinutes: remainingMinutes,
          willCloseIn: remainingMinutes > 0 ? `${remainingMinutes} minutos` : 'Pronto'
        });
      } catch (error) {
        res.status(500).json({ 
          error: 'Error al leer la URL del túnel',
          message: error.message
        });
      }
    });

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
          qr: '/qr',
          qrHtml: '/qr/qr.html',
          qrImage: '/qr/qr.png',
          qrApi: '/api/qr',
          tunnelUrl: '/api/tunnel-url'
        }
      });
    });
  }

  /**
   * Obtiene la IP local de la máquina
   */
  getLocalIP() {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
      for (const iface of networkInterfaces[interfaceName]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  }

  /**
   * Inicia el servidor
   */
  start() {
    // Escuchar en todas las interfaces (0.0.0.0) para acceso desde la red local
    this.app.listen(this.port, '0.0.0.0', () => {
      const localIP = this.getLocalIP();
      console.log(`Servidor activo en puerto ${this.port} 🚀`);
      console.log(`Acceso local: http://localhost:${this.port}/qr`);
      console.log(`Acceso desde red: http://${localIP}:${this.port}/qr`);
      console.log(`Endpoint QR (curl): http://${localIP}:${this.port}/api/qr`);
    });
  }
}
