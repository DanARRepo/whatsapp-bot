/**
 * Flujo de cancelación de citas
 */

import { CONVERSATION_STATES } from '../config/constants.js';
import { canModifyAppointment } from '../services/bookingService.js';
import { findAppointmentsByClient, deleteAppointment } from '../services/googleCalendar.js';

/**
 * Maneja la entrada para cancelación
 */
export async function handleCancelInput(message, phoneNumber, text, conversationState, dependencies) {
  const { conversationManager, calendarAuth } = dependencies;
  const input = text.trim();
  
  // Verificar si es una selección numérica de una lista previa
  if (conversationState.foundAppointments && /^\d+$/.test(input)) {
    const selectedIndex = parseInt(input) - 1;
    const appointments = conversationState.foundAppointments;
    
    if (selectedIndex >= 0 && selectedIndex < appointments.length) {
      const selectedAppointment = appointments[selectedIndex];
      const startDate = new Date(selectedAppointment.start.dateTime || selectedAppointment.start.date);
      
      // Validar si la cita puede ser cancelada (mínimo 1 hora de anticipación)
      if (!canModifyAppointment(selectedAppointment)) {
        const timeUntilAppointment = Math.ceil((startDate.getTime() - new Date().getTime()) / (1000 * 60));
        await message.reply(`❌ No puedes cancelar esta cita.\n\n📅 Cita: ${selectedAppointment.summary}\n🕐 Fecha: ${startDate.toLocaleDateString('es-CO')} ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n⏰ Tiempo restante: ${timeUntilAppointment} minutos\n\n⚠️ Las citas solo pueden ser canceladas con un mínimo de 1 hora de anticipación.`);
        return;
      }
      
      await message.reply(`📅 Cita seleccionada:\n\n👤 Cliente: ${selectedAppointment.summary}\n📅 Fecha: ${startDate.toLocaleDateString('es-CO')}\n🕐 Hora: ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n\n¿Estás seguro de que quieres cancelar esta cita? Responde "SÍ" para confirmar o "NO" para cancelar.`);
      
      // Guardar la cita seleccionada para la cancelación
      conversationManager.updateConversationState(phoneNumber, {
        currentAppointment: selectedAppointment,
        foundAppointments: null,
        state: CONVERSATION_STATES.CONFIRMING
      });
      return;
    } else {
      await message.reply(`❌ Opción no válida. Por favor, selecciona un número del 1 al ${appointments.length}.`);
      return;
    }
  }
  
  // Si el usuario está confirmando la cancelación
  if (conversationState.state === CONVERSATION_STATES.CONFIRMING && conversationState.currentAppointment) {
    const response = input.toLowerCase().trim();
    
    if (response.includes("sí") || response.includes("si") || response.includes("confirmar") || response === "1") {
      // Cancelar la cita
      const appointment = conversationState.currentAppointment;
      const deleted = await deleteAppointment(calendarAuth, appointment.id, appointment.calendarId);
      
      if (deleted) {
        const startDate = new Date(appointment.start.dateTime || appointment.start.date);
        await message.reply(`✅ Cita cancelada exitosamente.\n\n📅 Cita cancelada: ${appointment.summary}\n🕐 Fecha: ${startDate.toLocaleDateString('es-CO')} ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n\nSi necesitas agendar una nueva cita, escribe "hola" para comenzar.`);
        conversationManager.clearConversationState(phoneNumber);
      } else {
        await message.reply(`❌ Error al cancelar la cita. Por favor, intenta de nuevo más tarde.`);
      }
      return;
    } else if (response.includes("no") || response.includes("cancelar") || response === "2") {
      conversationManager.clearConversationState(phoneNumber);
      await message.reply("✅ Cancelación de cancelación confirmada. Tu cita sigue activa.\n\nSi necesitas algo más, escribe 'hola' para comenzar.");
      return;
    } else {
      await message.reply("❌ Por favor, responde con SÍ para confirmar la cancelación o NO para mantener la cita.");
      return;
    }
  }
  
  // Buscar citas por nombre o teléfono
  const appointments = await findAppointmentsByClient(calendarAuth, input, input);
  
  if (appointments.length === 0) {
    await message.reply(`❌ No encontré ninguna cita con "${input}".\n\nPor favor, verifica tu nombre o número de teléfono y vuelve a intentar.`);
    return;
  }
  
  if (appointments.length === 1) {
    const appointment = appointments[0];
    const startDate = new Date(appointment.start.dateTime || appointment.start.date);
    
    // Validar si la cita puede ser cancelada (mínimo 1 hora de anticipación)
    if (!canModifyAppointment(appointment)) {
      const timeUntilAppointment = Math.ceil((startDate.getTime() - new Date().getTime()) / (1000 * 60));
      await message.reply(`❌ No puedes cancelar esta cita.\n\n📅 Cita: ${appointment.summary}\n🕐 Fecha: ${startDate.toLocaleDateString('es-CO')} ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n⏰ Tiempo restante: ${timeUntilAppointment} minutos\n\n⚠️ Las citas solo pueden ser canceladas con un mínimo de 1 hora de anticipación.`);
      return;
    }
    
    await message.reply(`📅 Cita encontrada:\n\n👤 Cliente: ${appointment.summary}\n📅 Fecha: ${startDate.toLocaleDateString('es-CO')}\n🕐 Hora: ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n\n¿Estás seguro de que quieres cancelar esta cita? Responde "SÍ" para confirmar o "NO" para cancelar.`);
    
    // Guardar la cita para cancelación
    conversationManager.updateConversationState(phoneNumber, {
      currentAppointment: appointment,
      state: CONVERSATION_STATES.CONFIRMING
    });
  } else {
    // Múltiples citas encontradas - filtrar solo las que pueden ser canceladas
    const modifiableAppointments = appointments.filter(canModifyAppointment);
    
    if (modifiableAppointments.length === 0) {
      await message.reply(`❌ No tienes citas que puedan ser canceladas.\n\n⚠️ Las citas solo pueden ser canceladas con un mínimo de 1 hora de anticipación.`);
      return;
    }
    
    if (modifiableAppointments.length === 1) {
      // Si solo queda una cita modificable, proceder directamente
      const appointment = modifiableAppointments[0];
      const startDate = new Date(appointment.start.dateTime || appointment.start.date);
      
      await message.reply(`📅 Cita encontrada:\n\n👤 Cliente: ${appointment.summary}\n📅 Fecha: ${startDate.toLocaleDateString('es-CO')}\n🕐 Hora: ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n\n¿Estás seguro de que quieres cancelar esta cita? Responde "SÍ" para confirmar o "NO" para cancelar.`);
      
      conversationManager.updateConversationState(phoneNumber, {
        currentAppointment: appointment,
        state: CONVERSATION_STATES.CONFIRMING
      });
    } else {
      // Múltiples citas modificables
      let response = `📅 Encontré ${modifiableAppointments.length} citas que pueden ser canceladas:\n\n`;
      modifiableAppointments.forEach((appointment, index) => {
        const startDate = new Date(appointment.start.dateTime || appointment.start.date);
        response += `${index + 1}. ${appointment.summary} - ${startDate.toLocaleDateString('es-CO')} ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n`;
      });
      response += `\n¿Cuál cita quieres cancelar? Responde con el número (1, 2, 3, etc.)`;
      
      await message.reply(response);
      
      conversationManager.updateConversationState(phoneNumber, {
        foundAppointments: modifiableAppointments,
        state: CONVERSATION_STATES.CANCELLING
      });
    }
  }
}
