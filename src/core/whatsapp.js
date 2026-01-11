/**
 * Cliente de WhatsApp
 */

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";

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
    this.client.on('qr', (qr) => {
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
   * Inicializa el cliente de WhatsApp
   */
  async initialize() {
    await this.client.initialize();
  }
}
