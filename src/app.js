/**
 * Punto de entrada principal de la aplicación
 */

import dotenv from "dotenv";
import { WhatsAppClient } from './core/whatsapp.js';
import { WebServer } from './core/server.js';
import { authorizeGoogle } from './services/googleCalendar.js';
import ConversationManager from './data/conversationManager.js';
import { processMessage } from './flows/router.js';
import { getSmartGreeting, getMainMenu } from './config/messages.js';
import { CONVERSATION_STATES } from './config/constants.js';
import { isAIEnabled, getAIProvider, processNaturalLanguage, isAIResponseReliable } from './aiProviders/index.js';
import { validateEnv } from './config/env.js';

// Cargar variables de entorno
dotenv.config();

// Validar variables de entorno
try {
  validateEnv();
} catch (error) {
  console.error('❌ Error de configuración:', error.message);
  process.exit(1);
}

// Inicializar servicios
let calendarAuth;
const conversationManager = new ConversationManager();
const whatsappClient = new WhatsAppClient();
const webServer = new WebServer();

/**
 * Función principal para manejar mensajes
 */
async function handleMessage(message, phoneNumber, text) {
  const conversationState = conversationManager.getConversationState(phoneNumber);

  console.log(`🔍 [${phoneNumber}] Estado actual: ${conversationState.state}`);
  console.log(`📝 [${phoneNumber}] Texto recibido: "${text}"`);

  // IGNORAR MENSAJES VACÍOS
  const trimmedText = text.trim();
  if (!trimmedText || trimmedText.length === 0) {
    console.log(`⏭️ [${phoneNumber}] Mensaje vacío ignorado`);
    return;
  }

  // DETECTAR SALUDOS PRIMERO
  const greetings = [
    "hola", "buenos días", "buenas tardes", "buenas noches",
    "buenas", "hey", "hi", "hello", "saludos", "inicio", "menu",
    "empezar", "comenzar", "nuevo", "otra vez", "oe", "oye"
  ];

  const isGreeting = greetings.some(greeting => trimmedText.includes(greeting));

  // Si es un saludo, reiniciar conversación INMEDIATAMENTE
  if (isGreeting) {
    console.log(`🔄 [${phoneNumber}] Saludo detectado, reiniciando conversación`);
    conversationManager.clearConversationState(phoneNumber);
    
    if (isAIEnabled()) {
      await message.reply(getSmartGreeting());
    } else {
      await message.reply(getMainMenu());
    }
    return;
  }

  // Procesar con IA si está habilitada (solo en estados iniciales)
  if (isAIEnabled() && 
      (conversationState.state === CONVERSATION_STATES.MENU || 
       conversationState.state === CONVERSATION_STATES.SELECTING_BARBER ||
       conversationState.state === CONVERSATION_STATES.SELECTING_SERVICE)) {
    try {
      const aiResponse = await processNaturalLanguage(trimmedText, conversationState);
      
      if (aiResponse && isAIResponseReliable(aiResponse)) {
        console.log(`🤖 [${phoneNumber}] Respuesta IA confiable:`, aiResponse);
        
        // Manejar intención de reagendamiento o cancelación
        if (aiResponse.intent === 'reschedule') {
          conversationManager.updateConversationState(phoneNumber, {
            state: CONVERSATION_STATES.RESCHEDULING
          });
          await message.reply(`🔄 Para reagendar tu cita, necesito encontrar tu cita actual.\n\nPor favor, proporciona tu nombre completo o número de teléfono para buscar tu cita:`);
          return;
        }
        
        if (aiResponse.intent === 'cancel') {
          conversationManager.updateConversationState(phoneNumber, {
            state: CONVERSATION_STATES.CANCELLING
          });
          await message.reply(`❌ Para cancelar tu cita, necesito encontrar tu cita actual.\n\nPor favor, proporciona tu nombre completo o número de teléfono para buscar tu cita:`);
          return;
        }
      }
    } catch (error) {
      console.error(`❌ [${phoneNumber}] Error procesando con IA:`, error);
    }
  }

  // Delegar al router
  await processMessage(message, phoneNumber, trimmedText, conversationState, {
    calendarAuth,
    conversationManager
  });
}

// Configurar handler de mensajes
whatsappClient.onMessage(handleMessage);

/**
 * Función principal de inicialización
 */
async function main() {
  try {
    // Iniciar servidor web
    webServer.start();

    // Autorizar Google Calendar
    calendarAuth = await authorizeGoogle();

    // IA habilitada si está configurada
    if (isAIEnabled()) {
      const provider = getAIProvider();
      console.log(`🤖 IA habilitada: ${provider.name}`);
    } else {
      console.log("⚠️ IA deshabilitada, usando flujo tradicional");
    }

    // Inicializar cliente de WhatsApp
    await whatsappClient.initialize();

  } catch (error) {
    console.error("🔥 Error fatal:", error);
    process.exit(1);
  }
}

// Ejecutar aplicación
main();
