/**
 * Flujo de reagendamiento de citas
 */

import { CONVERSATION_STATES } from '../config/constants.js';
import { canModifyAppointment, extractTimeFromAppointment } from '../services/bookingService.js';
import { findAppointmentsByClient, deleteAppointment } from '../services/googleCalendar.js';
import { identifyBarber } from '../data/barbers.js';
import { identifyService } from '../data/services.js';
import * as bookingFlow from './bookingFlow.js';

/**
 * Extrae datos del cliente de una cita existente
 */
function extractClientDataFromAppointment(appointment) {
  const description = appointment.description || '';
  const summary = appointment.summary || '';
  
  const nameMatch = description.match(/Cliente:\s*([^\n,]+)/i);
  const clientName = nameMatch ? nameMatch[1].trim() : null;
  
  const phoneMatch = description.match(/Teléfono:\s*([^\n,]+)/i);
  const clientPhone = phoneMatch ? phoneMatch[1].trim() : null;
  
  const barberMatch = description.match(/Barbero:\s*([^\n,]+)/i);
  const barberName = barberMatch ? barberMatch[1].trim() : null;
  
  const serviceMatch = description.match(/Servicio:\s*([^\n,]+)/i);
  const serviceName = serviceMatch ? serviceMatch[1].trim() : null;
  
  if (!clientName && summary) {
    const summaryMatch = summary.match(/- ([^-]+)$/);
    if (summaryMatch) {
      return {
        name: summaryMatch[1].trim(),
        phone: clientPhone,
        barber: barberName,
        service: serviceName
      };
    }
  }
  
  return {
    name: clientName,
    phone: clientPhone,
    barber: barberName,
    service: serviceName
  };
}

/**
 * Identifica barbero y servicio por nombre
 */
function identifyBarberAndServiceFromNames(barberName, serviceName) {
  let identifiedBarber = null;
  let identifiedService = null;
  
  if (barberName) {
    identifiedBarber = identifyBarber(barberName);
  }
  
  if (serviceName) {
    identifiedService = identifyService(serviceName);
  }
  
  return {
    barber: identifiedBarber,
    service: identifiedService
  };
}

/**
 * Maneja la entrada para reagendamiento
 */
export async function handleRescheduleInput(message, phoneNumber, text, conversationState, dependencies) {
  const { conversationManager, calendarAuth } = dependencies;
  const input = text.trim();
  
  // Verificar si es una selección numérica de una lista previa
  if (conversationState.foundAppointments && /^\d+$/.test(input)) {
    const selectedIndex = parseInt(input) - 1;
    const appointments = conversationState.foundAppointments;
    
    if (selectedIndex >= 0 && selectedIndex < appointments.length) {
      const selectedAppointment = appointments[selectedIndex];
      const startDate = new Date(selectedAppointment.start.dateTime || selectedAppointment.start.date);
      
      // Validar si la cita puede ser modificada (mínimo 1 hora de anticipación)
      if (!canModifyAppointment(selectedAppointment)) {
        const timeUntilAppointment = Math.ceil((startDate.getTime() - new Date().getTime()) / (1000 * 60));
        await message.reply(`❌ No puedes reagendar esta cita.\n\n📅 Cita: ${selectedAppointment.summary}\n🕐 Fecha: ${startDate.toLocaleDateString('es-CO')} ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n⏰ Tiempo restante: ${timeUntilAppointment} minutos\n\n⚠️ Las citas solo pueden ser reagendadas con un mínimo de 1 hora de anticipación.`);
        return;
      }
      
      // Extraer datos del cliente de la cita original
      const clientData = extractClientDataFromAppointment(selectedAppointment);
      
      // Identificar barbero y servicio
      const identified = identifyBarberAndServiceFromNames(clientData.barber, clientData.service);
      
      await message.reply(`📅 Cita seleccionada:\n\n👤 Cliente: ${selectedAppointment.summary}\n📅 Fecha: ${startDate.toLocaleDateString('es-CO')}\n🕐 Hora: ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n\n¿Para qué nueva fecha y hora te gustaría reagendar esta cita?`);
      
      // Guardar la cita seleccionada y todos los datos para el reagendamiento
      conversationManager.updateConversationState(phoneNumber, {
        currentAppointment: selectedAppointment,
        foundAppointments: null,
        clientName: clientData.name,
        clientPhone: clientData.phone,
        selectedBarber: identified.barber,
        selectedService: identified.service,
        state: CONVERSATION_STATES.SELECTING_DATE
      });
      return;
    } else {
      await message.reply(`❌ Opción no válida. Por favor, selecciona un número del 1 al ${appointments.length}.`);
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
    
    // Validar si la cita puede ser modificada
    if (!canModifyAppointment(appointment)) {
      const timeUntilAppointment = Math.ceil((startDate.getTime() - new Date().getTime()) / (1000 * 60));
      await message.reply(`❌ No puedes reagendar esta cita.\n\n📅 Cita: ${appointment.summary}\n🕐 Fecha: ${startDate.toLocaleDateString('es-CO')} ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n⏰ Tiempo restante: ${timeUntilAppointment} minutos\n\n⚠️ Las citas solo pueden ser reagendadas con un mínimo de 1 hora de anticipación.`);
      return;
    }
    
    const clientData = extractClientDataFromAppointment(appointment);
    const identified = identifyBarberAndServiceFromNames(clientData.barber, clientData.service);
    
    await message.reply(`📅 Cita encontrada:\n\n👤 Cliente: ${appointment.summary}\n📅 Fecha: ${startDate.toLocaleDateString('es-CO')}\n🕐 Hora: ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n\n¿Para qué nueva fecha y hora te gustaría reagendar esta cita?`);
    
    conversationManager.updateConversationState(phoneNumber, {
      currentAppointment: appointment,
      clientName: clientData.name,
      clientPhone: clientData.phone,
      selectedBarber: identified.barber,
      selectedService: identified.service,
      state: CONVERSATION_STATES.SELECTING_DATE
    });
  } else {
    // Múltiples citas encontradas - filtrar solo las que pueden ser modificadas
    const modifiableAppointments = appointments.filter(canModifyAppointment);
    
    if (modifiableAppointments.length === 0) {
      await message.reply(`❌ No tienes citas que puedan ser reagendadas.\n\n⚠️ Las citas solo pueden ser reagendadas con un mínimo de 1 hora de anticipación.`);
      return;
    }
    
    if (modifiableAppointments.length === 1) {
      const appointment = modifiableAppointments[0];
      const startDate = new Date(appointment.start.dateTime || appointment.start.date);
      const clientData = extractClientDataFromAppointment(appointment);
      const identified = identifyBarberAndServiceFromNames(clientData.barber, clientData.service);
      
      await message.reply(`📅 Cita encontrada:\n\n👤 Cliente: ${appointment.summary}\n📅 Fecha: ${startDate.toLocaleDateString('es-CO')}\n🕐 Hora: ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n\n¿Para qué nueva fecha y hora te gustaría reagendar esta cita?`);
      
      conversationManager.updateConversationState(phoneNumber, {
        currentAppointment: appointment,
        clientName: clientData.name,
        clientPhone: clientData.phone,
        selectedBarber: identified.barber,
        selectedService: identified.service,
        state: CONVERSATION_STATES.SELECTING_DATE
      });
    } else {
      // Múltiples citas modificables
      let response = `📅 Encontré ${modifiableAppointments.length} citas que pueden ser reagendadas:\n\n`;
      modifiableAppointments.forEach((appointment, index) => {
        const startDate = new Date(appointment.start.dateTime || appointment.start.date);
        response += `${index + 1}. ${appointment.summary} - ${startDate.toLocaleDateString('es-CO')} ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n`;
      });
      response += `\n¿Cuál cita quieres reagendar? Responde con el número (1, 2, 3, etc.)`;
      
      await message.reply(response);
      
      conversationManager.updateConversationState(phoneNumber, {
        foundAppointments: modifiableAppointments,
        state: CONVERSATION_STATES.RESCHEDULING
      });
    }
  }
}
