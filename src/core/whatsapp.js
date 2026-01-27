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
      markMessagesAsRead: false, // Deshabilitar marcado automático de mensajes como leídos
      puppeteer: {
        // FORZAR EL USO DEL CHROMIUM DE NIXOS
        executablePath: '/run/current-system/sw/bin/chromium',
        headless: true, // true por defecto en servidor headless
        args: [
          // Argumentos esenciales para headless sin display server
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-webgl',
          '--disable-webgl2',
          
          // Modo headless completo (sin interfaz gráfica)
          // Nota: headless: true en Puppeteer ya maneja esto, pero estos flags adicionales
          // aseguran compatibilidad en NixOS minimal sin display server
          '--headless=new',  // Usar nuevo modo headless (más eficiente)
          '--disable-features=VizDisplayCompositor',  // Deshabilitar compositor visual
          '--disable-gpu-sandbox',  // Deshabilitar sandbox de GPU (no disponible en headless)
          
          // Optimizaciones para hardware limitado (4GB RAM)
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-breakpad',
          '--disable-client-side-phishing-detection',
          '--disable-component-extensions-with-background-pages',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-features=TranslateUI,BlinkGenPropertyTrees',
          '--disable-hang-monitor',
          '--disable-ipc-flooding-protection',
          '--disable-popup-blocking',
          '--disable-prompt-on-repost',
          '--disable-renderer-backgrounding',
          '--disable-sync',
          '--disable-translate',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-default-browser-check',
          '--no-pings',
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          
          // Deshabilitar características que requieren interfaz gráfica
          '--disable-notifications',
          '--disable-infobars',
          '--disable-session-crashed-bubble',
          '--disable-component-update',
          '--disable-domain-reliability',
          '--disable-features=AudioServiceOutOfProcess',
          
          // Límites de memoria
          '--max_old_space_size=512',
          '--js-flags=--max-old-space-size=512',
          
          // Reducir uso de recursos (sin --single-process porque whatsapp-web.js necesita múltiples procesos)
          '--disable-features=site-per-process',  // Reducir procesos
          '--disable-site-isolation-trials',  // Deshabilitar aislamiento de sitios para reducir memoria
        ]
      }
    });
    
    // Set para deduplicar mensajes procesados
    this.processedMessages = new Set();
    // Limpiar mensajes procesados después de 5 minutos para evitar memory leak
    setInterval(() => {
      if (this.processedMessages.size > 1000) {
        this.processedMessages.clear();
      }
    }, 5 * 60 * 1000);
    
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
   * Wrapper para message.reply que maneja errores de sendSeen
   * @param {Object} message - Objeto de mensaje de whatsapp-web.js
   * @param {string} content - Contenido a enviar
   * @param {Function} originalReply - Método reply original (para evitar loops)
   */
  async safeReply(message, content, originalReply) {
    try {
      // Usar el método original si está disponible, sino usar sendMessage directamente
      if (originalReply) {
        await originalReply.call(message, content);
      } else {
        // Enviar directamente usando sendMessage para evitar sendSeen
        const chat = await message.getChat();
        const chatId = chat.id._serialized || chat.id;
        await this.client.sendMessage(chatId, content, {
          linkPreview: false
        });
      }
    } catch (error) {
      // Capturar y analizar el error
      const errorMessage = error.message || String(error);
      const errorStack = error.stack || '';
      
      // Verificar si es un error de sendSeen/markedUnread
      const isSendSeenError = 
        errorMessage.includes('markedUnread') || 
        errorMessage.includes('sendSeen') ||
        errorMessage.includes('Cannot read properties of undefined') ||
        errorStack.includes('sendSeen');
      
      if (isSendSeenError) {
        // El error es de sendSeen, el mensaje probablemente se envió correctamente
        console.warn(`⚠️ [${message.from}] Error de sendSeen ignorado - mensaje enviado`);
        return; // Continuar como si fuera exitoso
      }
      
      // Si no es un error de sendSeen, intentar enviar directamente
      try {
        const chat = await message.getChat();
        const chatId = chat.id._serialized || chat.id;
        await this.client.sendMessage(chatId, content, {
          linkPreview: false
        });
      } catch (sendError) {
        // Si también falla sendMessage, re-lanzar el error original
        throw error;
      }
    }
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

        // DEDUPLICACIÓN: Verificar si ya procesamos este mensaje
        const messageId = message.id._serialized || message.id;
        if (this.processedMessages.has(messageId)) {
          console.log(`⏭️ [${message.from}] Mensaje duplicado ignorado: ${messageId}`);
          return;
        }
        this.processedMessages.add(messageId);

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

        // Procesar mensaje directamente (sin setImmediate para reducir latencia)
        try {
          // Guardar el método reply original ANTES de interceptarlo
          const originalReply = message.reply.bind(message);
          
          // Interceptar el método reply para usar safeReply (pasando originalReply para evitar loops)
          message.reply = async (content) => {
            return await this.safeReply(message, content, originalReply);
          };
          
          await messageHandler(message, phoneNumber, trimmedText);
          
          // Restaurar el método original después de procesar
          message.reply = originalReply;
        } catch (error) {
          console.error(`❌ [${phoneNumber}] Error al procesar mensaje:`, error);
          // NO intentar enviar mensaje de error si el error es de sendSeen
          // porque eso causará un loop de errores
          if (error.message && error.message.includes('markedUnread')) {
            console.warn(`⚠️ [${phoneNumber}] Error de sendSeen ignorado`);
            return;
          }
          // Solo intentar enviar mensaje de error si no es un error de sendSeen
          try {
            const originalReply = message.reply?.bind(message) || null;
            await this.safeReply(message, "❌ Ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.", originalReply);
          } catch (replyError) {
            console.error(`❌ [${phoneNumber}] Error al enviar mensaje de error:`, replyError.message || replyError);
          }
        }
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
