/**
 * Cliente de WhatsApp
 */

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const QR_DIR = path.join(__dirname, "../../qr");

export class WhatsAppClient {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: process.env.WHATSAPP_HEADLESS === 'true',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });
    
    this.setupEvents();
  }

  setupEvents() {
    // Evento cuando se genera el QR
    this.client.on('qr', async (qr) => {
      console.log("\n" + "=".repeat(50));
      console.log("📱 ESCANEA ESTE QR CON WHATSAPP:");
      console.log("=".repeat(50));
      qrcode.generate(qr, { small: true });
      console.log("=".repeat(50));
      console.log("1. Abre WhatsApp en tu teléfono");
      console.log("2. Ve a Configuración > Dispositivos vinculados");
      console.log("3. Toca 'Vincular un dispositivo'");
      console.log("4. Escanea el QR de arriba");
      console.log("=".repeat(50) + "\n");
      
      // Guardar QR en archivo para acceso remoto
      await this.saveQRToFile(qr);
    });

    // Evento cuando se conecta exitosamente
    this.client.on('ready', () => {
      console.log("✅ ¡Conectado a WhatsApp exitosamente!");
      console.log("🤖 El bot está listo para recibir mensajes");
    });

    // Evento cuando se desconecta
    this.client.on('disconnected', (reason) => {
      console.log("❌ Cliente desconectado:", reason);
    });
  }

  /**
   * Configura el handler de mensajes
   * @param {Function} messageHandler - Función que procesa los mensajes
   */
  onMessage(messageHandler) {
    this.client.on('message', async (message) => {
      try {
        // Ignorar mensajes del bot
        if (message.fromMe) return;

        const text = message.body?.toLowerCase() || "";
        const from = message.from;
        const phoneNumber = from.replace("@c.us", "");

        // FILTRAR MENSAJES VACÍOS inmediatamente
        const trimmedText = text.trim();
        if (!trimmedText || trimmedText.length === 0) {
          console.log(`⏭️ [${phoneNumber}] Mensaje vacío ignorado en el listener`);
          return;
        }

        console.log(`📨 [${phoneNumber}] Mensaje: "${trimmedText}"`);

        // Procesar mensaje de forma asíncrona para no bloquear otras sesiones
        setImmediate(async () => {
          try {
            await messageHandler(message, phoneNumber, trimmedText);
          } catch (error) {
            console.error(`❌ [${phoneNumber}] Error al procesar mensaje:`, error);
            await message.reply("❌ Ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.");
          }
        });
      } catch (error) {
        console.error("❌ Error general al procesar mensaje:", error);
      }
    });
  }

  /**
   * Guarda el QR en un archivo HTML accesible vía HTTP
   * @param {string} qr - Código QR en formato string
   */
  async saveQRToFile(qr) {
    try {
      // Asegurar que el directorio existe
      if (!fs.existsSync(QR_DIR)) {
        fs.mkdirSync(QR_DIR, { recursive: true });
      }

      // Generar QR como imagen PNG (base64)
      const qrDataURL = await QRCode.toDataURL(qr, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Crear archivo HTML con el QR
      const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp QR Code</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
        }
        h1 {
            margin-top: 0;
            color: #25D366;
            font-size: 1.8rem;
        }
        .qr-code {
            margin: 1.5rem 0;
            padding: 1rem;
            background: #f5f5f5;
            border-radius: 10px;
        }
        .qr-code img {
            max-width: 100%;
            height: auto;
            border-radius: 10px;
        }
        .instructions {
            background: #f0f9ff;
            padding: 1rem;
            border-radius: 10px;
            margin-top: 1rem;
            text-align: left;
        }
        .instructions ol {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
        }
        .instructions li {
            margin: 0.5rem 0;
            line-height: 1.6;
        }
        .timestamp {
            color: #666;
            font-size: 0.9rem;
            margin-top: 1rem;
        }
        .auto-refresh {
            color: #25D366;
            font-size: 0.85rem;
            margin-top: 0.5rem;
        }
    </style>
    <script>
        // Auto-refresh cada 5 segundos para detectar nuevos QR
        setTimeout(function() {
            location.reload();
        }, 5000);
    </script>
</head>
<body>
    <div class="container">
        <h1>📱 Código QR de WhatsApp</h1>
        <div class="qr-code">
            <img src="${qrDataURL}" alt="WhatsApp QR Code">
        </div>
        <div class="instructions">
            <strong>Instrucciones:</strong>
            <ol>
                <li>Abre WhatsApp en tu teléfono</li>
                <li>Ve a <strong>Configuración</strong> > <strong>Dispositivos vinculados</strong></li>
                <li>Toca <strong>"Vincular un dispositivo"</strong></li>
                <li>Escanea el código QR de arriba</li>
            </ol>
        </div>
        <div class="timestamp">
            Generado: ${new Date().toLocaleString('es-ES', { 
              dateStyle: 'full', 
              timeStyle: 'medium' 
            })}
        </div>
        <div class="auto-refresh">
            🔄 Esta página se actualiza automáticamente cada 5 segundos
        </div>
    </div>
</body>
</html>`;

      // Guardar archivo HTML
      const htmlPath = path.join(QR_DIR, "qr.html");
      fs.writeFileSync(htmlPath, htmlContent, "utf8");
      
      // También guardar solo la imagen PNG
      const qrBuffer = await QRCode.toBuffer(qr, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      const pngPath = path.join(QR_DIR, "qr.png");
      fs.writeFileSync(pngPath, qrBuffer);

      console.log(`\n🌐 QR guardado en archivos:`);
      console.log(`   - HTML: ${htmlPath}`);
      console.log(`   - PNG: ${pngPath}`);
      console.log(`   - Acceso web: http://localhost:${process.env.PORT || 3000}/qr\n`);
    } catch (error) {
      console.error("❌ Error al guardar QR:", error);
    }
  }

  /**
   * Inicializa el cliente de WhatsApp
   */
  async initialize() {
    await this.client.initialize();
  }
}
