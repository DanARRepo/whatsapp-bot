import { BUSINESS_HOURS, conflictsWithBreakTime } from '../config/business.js';

/**
 * Genera opciones de horarios disponibles para una fecha específica
 * @param {Date} date - Fecha para la cual generar horarios
 * @param {number} serviceDuration - Duración del servicio en minutos
 * @param {Array} existingAppointments - Array de citas existentes
 * @param {string} scheduleType - Tipo de horario: 'general' o 'extra'
 * @returns {Array<string>} Array de horarios disponibles en formato HH:MM
 */
export function getAvailableTimeSlots(date, serviceDuration, existingAppointments = [], scheduleType = 'general') {
  const slots = [];
  const slotDuration = 30; // 30 minutos por slot
  
  // Verificar que sea día laboral (lunes a sábado)
  const dayOfWeek = date.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  if (dayOfWeek === 0) { // Domingo
    return []; // No hay horarios disponibles los domingos
  }
  
  // Definir horarios según el tipo
  let startHour, endHour, lastAppointment;
  
  if (scheduleType === 'extra') {
    startHour = parseInt(BUSINESS_HOURS.EXTRA_OPEN.split(':')[0]);
    endHour = parseInt(BUSINESS_HOURS.EXTRA_CLOSE.split(':')[0]);
    lastAppointment = parseInt(BUSINESS_HOURS.EXTRA_LAST_APPOINTMENT.split(':')[0]);
  } else {
    startHour = parseInt(BUSINESS_HOURS.GENERAL_OPEN.split(':')[0]);
    endHour = parseInt(BUSINESS_HOURS.GENERAL_CLOSE.split(':')[0]);
    lastAppointment = parseInt(BUSINESS_HOURS.GENERAL_LAST_APPOINTMENT.split(':')[0]);
  }
  
  // Obtener hora actual
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Si es el mismo día, calcular la hora mínima para agendar (hora actual + 1 hora)
  const isToday = date.toDateString() === now.toDateString();
  let minHour = startHour;
  let minMinute = 0;
  
  if (isToday) {
    // Agregar anticipación mínima configurable
    const minAdvanceHours = parseInt(process.env.MIN_ADVANCE_HOURS) || 1;
    minHour = currentHour + minAdvanceHours;
    minMinute = currentMinute;
    
    // Redondear hacia arriba a la próxima media hora
    if (minMinute > 0) {
      minMinute = 30;
      if (minMinute >= 60) {
        minMinute = 0;
        minHour++;
      }
    }
    
    // No permitir agendar si ya es muy tarde
    if (minHour >= endHour) {
      return [];
    }
  }
  
  // Crear array de horarios ocupados
  const occupiedSlots = [];
  existingAppointments.forEach(appointment => {
    if (!appointment.startTime || !appointment.endTime) return;
    
    // Convertir a objetos Date
    const startTime = new Date(appointment.startTime);
    const endTime = new Date(appointment.endTime);
    
    // Convertir a horario local
    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();
    
    // Marcar todos los slots de 30 minutos que están ocupados
    let currentHour = startHour;
    let currentMinute = startMinute;
    
    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      occupiedSlots.push(timeString);
      
      // Avanzar 30 minutos
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour++;
      }
    }
  });
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minutes = 0; minutes < 60; minutes += slotDuration) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      // Saltar horario de descanso usando la función de validación
      if (conflictsWithBreakTime(timeString, serviceDuration)) {
        continue;
      }
      
      // Saltar si es después de la última cita permitida
      if (hour > lastAppointment || (hour === lastAppointment && minutes > 0)) {
        break;
      }
      
      // Si es el mismo día, solo mostrar horarios futuros
      if (isToday) {
        if (hour < minHour || (hour === minHour && minutes < minMinute)) {
          continue;
        }
      }
      
      // Solo agregar si no está ocupado
      if (!occupiedSlots.includes(timeString)) {
        slots.push(timeString);
      }
    }
  }
  
  return slots;
}

/**
 * Extrae la hora de una cita existente
 * @param {Object} appointment - Objeto de cita con startTime
 * @returns {string} Hora en formato HH:MM
 */
export function extractTimeFromAppointment(appointment) {
  if (!appointment.startTime) return null;
  
  const startTime = new Date(appointment.startTime);
  const hour = startTime.getHours().toString().padStart(2, '0');
  const minute = startTime.getMinutes().toString().padStart(2, '0');
  return `${hour}:${minute}`;
}

/**
 * Valida si una fecha es válida para agendar (no es pasada)
 * @param {Date} date - Fecha a validar
 * @returns {boolean} true si la fecha es válida
 */
export function isValidDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

/**
 * Valida si se puede modificar o cancelar una cita (mínimo 1 hora de anticipación)
 * @param {Object} appointment - Objeto de cita con start
 * @returns {boolean} true si se puede modificar
 */
export function canModifyAppointment(appointment) {
  if (!appointment.start) return false;
  
  const appointmentTime = new Date(appointment.start.dateTime || appointment.start.date);
  const now = new Date();
  const diffInMs = appointmentTime - now;
  const diffInHours = diffInMs / (1000 * 60 * 60);
  
  return diffInHours >= 1;
}
