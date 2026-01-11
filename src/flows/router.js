/**
 * Router principal que delega mensajes a los flujos correspondientes
 */

import { CONVERSATION_STATES } from '../config/constants.js';
import * as mainMenuFlow from './mainMenu.js';
import * as bookingFlow from './bookingFlow.js';
import * as rescheduleFlow from './rescheduleFlow.js';
import * as cancelFlow from './cancelFlow.js';

/**
 * Procesa un mensaje y lo delega al flujo correspondiente según el estado
 * @param {Object} message - Mensaje de WhatsApp
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @param {string} text - Texto del mensaje
 * @param {Object} conversationState - Estado actual de la conversación
 * @param {Object} dependencies - Dependencias (calendarAuth, conversationManager, etc.)
 */
export async function processMessage(message, phoneNumber, text, conversationState, dependencies) {
  const { calendarAuth, conversationManager } = dependencies;
  
  console.log(`🔄 [${phoneNumber}] Router - Estado: ${conversationState.state}, Mensaje: "${text}"`);
  
  try {
    switch (conversationState.state) {
      case CONVERSATION_STATES.MENU:
        await mainMenuFlow.handleMenuSelection(message, phoneNumber, text, conversationState, dependencies);
        break;
        
      case CONVERSATION_STATES.SELECTING_BARBER:
        await bookingFlow.handleBarberSelection(message, phoneNumber, text, conversationState, dependencies);
        break;
        
      case CONVERSATION_STATES.SELECTING_SERVICE:
        await bookingFlow.handleServiceSelection(message, phoneNumber, text, conversationState, dependencies);
        break;
        
      case CONVERSATION_STATES.COLLECTING_NAME:
        await bookingFlow.handleNameInput(message, phoneNumber, text, conversationState, dependencies);
        break;
        
      case CONVERSATION_STATES.COLLECTING_PHONE:
        await bookingFlow.handlePhoneInput(message, phoneNumber, text, conversationState, dependencies);
        break;
        
      case CONVERSATION_STATES.SELECTING_DATE:
        await bookingFlow.handleDateSelection(message, phoneNumber, text, conversationState, dependencies);
        break;
        
      case CONVERSATION_STATES.SELECTING_SCHEDULE_TYPE:
        await bookingFlow.handleScheduleTypeSelection(message, phoneNumber, text, conversationState, dependencies);
        break;
        
      case CONVERSATION_STATES.SELECTING_TIME:
        await bookingFlow.handleTimeSelection(message, phoneNumber, text, conversationState, dependencies);
        break;
        
      case CONVERSATION_STATES.CONFIRMING:
        // Si hay currentAppointment, es una confirmación de cancelación
        if (conversationState.currentAppointment && !conversationState.selectedBarber) {
          await cancelFlow.handleCancelInput(message, phoneNumber, text, conversationState, dependencies);
        } else {
          // Es una confirmación de agendamiento
          await bookingFlow.handleConfirmation(message, phoneNumber, text, conversationState, dependencies);
        }
        break;
        
      case CONVERSATION_STATES.AMBIGUOUS_DATE:
        await bookingFlow.handleAmbiguousDate(message, phoneNumber, text, conversationState, dependencies);
        break;
        
      case CONVERSATION_STATES.RESCHEDULING:
        await rescheduleFlow.handleRescheduleInput(message, phoneNumber, text, conversationState, dependencies);
        break;
        
      case CONVERSATION_STATES.CANCELLING:
        await cancelFlow.handleCancelInput(message, phoneNumber, text, conversationState, dependencies);
        break;
        
      default:
        console.log(`🔄 [${phoneNumber}] Estado desconocido: ${conversationState.state}, mostrando menú`);
        await mainMenuFlow.showMainMenu(message, phoneNumber, text, conversationState, dependencies);
    }
  } catch (error) {
    console.error(`❌ [${phoneNumber}] Error en router:`, error);
    await message.reply("❌ Ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.");
    throw error;
  }
}
