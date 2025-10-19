// Servicios de barbería disponibles
export const SERVICES = {
  SIMPLE_CUT: {
    id: 1,
    name: "Corte sencillo",
    description: "Corte de cabello básico",
    duration: parseInt(process.env.SERVICE_SIMPLE_CUT_DURATION) || 30, // minutos
    price: parseInt(process.env.SERVICE_SIMPLE_CUT_PRICE) || 20000, // pesos colombianos
    emoji: "✂️"
  },
  CUT_WITH_BEARD: {
    id: 2,
    name: "Corte con barba",
    description: "Corte completo con barba",
    duration: parseInt(process.env.SERVICE_CUT_WITH_BEARD_DURATION) || 45, // minutos
    price: parseInt(process.env.SERVICE_CUT_WITH_BEARD_PRICE) || 25000, // pesos colombianos
    emoji: "🧔"
  },
  BEARD_ONLY: {
    id: 3,
    name: "Solo barba",
    description: "Cita para cortar solo barba",
    duration: parseInt(process.env.SERVICE_BEARD_ONLY_DURATION) || 15, // minutos
    price: parseInt(process.env.SERVICE_BEARD_ONLY_PRICE) || 10000, // pesos colombianos
    emoji: "🪒"
  }
};

// Horario de atención
export const BUSINESS_HOURS = {
  OPEN: process.env.BUSINESS_HOURS_OPEN || "08:00",
  CLOSE: process.env.BUSINESS_HOURS_CLOSE || "19:30",
  TIMEZONE: process.env.GOOGLE_TIMEZONE || "America/Bogota"
};

// Estados de conversación
export const CONVERSATION_STATES = {
  MENU: "menu",
  COLLECTING_NAME: "collecting_name",
  COLLECTING_PHONE: "collecting_phone",
  SELECTING_DATE: "selecting_date",
  SELECTING_TIME: "selecting_time",
  CONFIRMING: "confirming"
};

// Función para obtener el menú principal
export function getMainMenu() {
  const businessName = process.env.BUSINESS_NAME || "Cabelleros";
  
  return `¡Hola! 👋 Bienvenido a ${businessName}💈
Soy tu asistente virtual y estoy aquí para ayudarte a reservar tu turno o responder tus dudas.

¿Qué te gustaría hacer hoy?:

1. Agendar un corte sencillo ${SERVICES.SIMPLE_CUT.emoji}

2. Agendar un corte con barba ${SERVICES.CUT_WITH_BEARD.emoji}

3. Conocer nuestros servicios y precios 📋

📌 Nota: Nuestro horario de atención es de ${BUSINESS_HOURS.OPEN} a.m. a ${BUSINESS_HOURS.CLOSE} p.m.

Por favor, responde con el número de la opción que prefieras.`;
}

// Función para mostrar servicios y precios
export function getServicesAndPrices() {
  return `📋 NUESTROS SERVICIOS Y PRECIOS:

${SERVICES.SIMPLE_CUT.emoji} ${SERVICES.SIMPLE_CUT.name}
   ${SERVICES.SIMPLE_CUT.description}
   ⏱️ Duración: ${SERVICES.SIMPLE_CUT.duration} minutos
   💰 Precio: $${SERVICES.SIMPLE_CUT.price.toLocaleString()} COP

${SERVICES.CUT_WITH_BEARD.emoji} ${SERVICES.CUT_WITH_BEARD.name}
   ${SERVICES.CUT_WITH_BEARD.description}
   ⏱️ Duración: ${SERVICES.CUT_WITH_BEARD.duration} minutos
   💰 Precio: $${SERVICES.CUT_WITH_BEARD.price.toLocaleString()} COP

${SERVICES.BEARD_ONLY.emoji} ${SERVICES.BEARD_ONLY.name}
   ${SERVICES.BEARD_ONLY.description}
   ⏱️ Duración: ${SERVICES.BEARD_ONLY.duration} minutos
   💰 Precio: $${SERVICES.BEARD_ONLY.price.toLocaleString()} COP

¿Te gustaría agendar alguno de estos servicios? Responde con el número de la opción que prefieras.`;
}

// Función para obtener servicio por ID
export function getServiceById(id) {
  return Object.values(SERVICES).find(service => service.id === parseInt(id));
}

// Función para validar horario de atención
export function isWithinBusinessHours(time) {
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    timeZone: BUSINESS_HOURS.TIMEZONE 
  });
  
  return currentTime >= BUSINESS_HOURS.OPEN && currentTime <= BUSINESS_HOURS.CLOSE;
}

// Función para generar opciones de horarios disponibles
export function getAvailableTimeSlots(date, serviceDuration, existingAppointments = []) {
  const slots = [];
  const startHour = 8; // 8:00 AM
  const endHour = 20; // 8:00 PM
  const slotDuration = 30; // 30 minutos por slot
  
  // Verificar que sea día laboral (lunes a sábado)
  const dayOfWeek = date.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  if (dayOfWeek === 0) { // Domingo
    return []; // No hay horarios disponibles los domingos
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
    
    // No permitir agendar si ya es muy tarde (después de las 7 PM)
    if (minHour >= 20) {
      return [];
    }
  }
  
  // Crear array de horarios ocupados
  const occupiedSlots = [];
  existingAppointments.forEach(appointment => {
    const startTime = new Date(appointment.start.dateTime || appointment.start.date);
    const endTime = new Date(appointment.end.dateTime || appointment.end.date);
    
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
      // Permitir última cita a las 7:25 (19:25) para que termine a las 8:00
      if (hour === 19 && minutes > 25) break;
      
      // Si es el mismo día, solo mostrar horarios futuros
      if (isToday) {
        if (hour < minHour || (hour === minHour && minutes < minMinute)) {
          continue;
        }
      }
      
      const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      // Solo agregar si no está ocupado
      if (!occupiedSlots.includes(timeString)) {
        slots.push(timeString);
      }
    }
  }
  
  return slots;
}
