/**
 * Flujo del menú principal y saludos
 */

import { CONVERSATION_STATES } from '../config/constants.js';
import { getMainMenu, getSmartGreeting, getServicesAndPrices, getBarberMenu, getBarberMenuNatural } from '../config/messages.js';
import { isAIEnabled } from '../aiProviders/index.js';

/**
 * Función auxiliar para enviar mensajes con lenguaje natural cuando IA está habilitada
 */
async function sendMessageWithNaturalLanguage(message, text, suggestions = []) {
  let messageText = text;
  
  if (suggestions.length > 0) {
    messageText += '\n\n💡 Puedes responder de forma natural, por ejemplo:\n';
    suggestions.forEach((suggestion) => {
      messageText += `• ${suggestion}\n`;
    });
  }
  
  await message.reply(messageText);
}

/**
 * Muestra el menú principal
 */
export async function showMainMenu(message, phoneNumber, text, conversationState, dependencies) {
  const { conversationManager } = dependencies;
  
  conversationManager.updateConversationState(phoneNumber, { state: CONVERSATION_STATES.MENU });

  // Detectar si es un saludo para personalizar la respuesta
  const greetings = [
    "hola", "buenos días", "buenas tardes", "buenas noches",
    "buenas", "hey", "hi", "hello", "saludos", "inicio", "menu",
    "empezar", "comenzar", "nuevo", "otra vez"
  ];

  const isGreeting = greetings.some(greeting => text.toLowerCase().includes(greeting));

  if (isGreeting) {
    // Usar lenguaje natural si la IA está habilitada, sino usar menú tradicional
    if (isAIEnabled()) {
      await message.reply(getSmartGreeting());
    } else {
      await message.reply(getMainMenu());
    }
  }
}

/**
 * Maneja la selección del menú
 */
export async function handleMenuSelection(message, phoneNumber, text, conversationState, dependencies) {
  const { conversationManager } = dependencies;
  const option = text.trim();

  // Detectar casos ambiguos de servicios
  const ambiguousServiceRequests = [
    "turno", "turnito", "cita", "agendar", "reservar", "reserva",
    "motilada", "corte", "cortar", "cortarme", "arreglar", "arreglarme",
    "servicio", "atender", "visitar", "pasar", "ir", "quiero", "necesito"
  ];

  const isAmbiguousService = ambiguousServiceRequests.some(ambiguous => text.includes(ambiguous));

  // Manejar opciones numéricas o lenguaje natural
  if (option === "1" || option === "book_appointment" || isAmbiguousService) {
    // Agendar cita - mostrar menú de barberos
    conversationManager.updateConversationState(phoneNumber, {
      state: CONVERSATION_STATES.SELECTING_BARBER
    });
    
    if (isAmbiguousService) {
      if (isAIEnabled()) {
        const barberText = `🤔 Entiendo que quieres agendar una cita. Para ayudarte mejor, necesito que me digas con qué barbero quieres agendar:`;
        const suggestions = [
          "Con Mauricio",
          "Con Stiven",
          "Cualquiera está bien"
        ];
        await sendMessageWithNaturalLanguage(message, barberText, suggestions);
      } else {
        if (isAIEnabled()) {
          await message.reply(`🤔 Entiendo que quieres agendar una cita. Para ayudarte mejor, necesito que selecciones tu barbero preferido:\n\n${getBarberMenuNatural()}`);
        } else {
          await message.reply(`🤔 Entiendo que quieres agendar una cita. Para ayudarte mejor, necesito que selecciones tu barbero preferido:\n\n${getBarberMenu()}`);
        }
      }
    } else {
      if (isAIEnabled()) {
        const barberText = `👨‍💼 ¿Con qué barbero quieres agendar tu cita?`;
        const suggestions = [
          "Con Mauricio",
          "Con Stiven"
        ];
        await sendMessageWithNaturalLanguage(message, barberText, suggestions);
      } else {
        if (isAIEnabled()) {
          await message.reply(getBarberMenuNatural());
        } else {
          await message.reply(getBarberMenu());
        }
      }
    }
  } else if (option === "2" || option === "view_services") {
    // Mostrar servicios y precios
    await message.reply(getServicesAndPrices());
  } else {
    // Detectar si es una solicitud de información
    const infoRequests = ["servicios", "precios", "que tienen", "que ofrecen", "informacion", "ayuda"];
    const isInfoRequest = infoRequests.some(info => text.includes(info));
    
    if (isInfoRequest) {
      await message.reply(getServicesAndPrices());
    } else {
      await message.reply("❌ Opción no válida. Por favor, responde con 1 o 2.\n\n💡 Si quieres empezar de nuevo, escribe 'hola' o 'menu'.");
    }
  }
}
