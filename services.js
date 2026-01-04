// Servicios de barbería disponibles
export const SERVICES = {
  SIMPLE_CUT: {
    id: 1,
    name: "Corte de cabello",
    aliases: ["corte", "corte sencillo", "corte normal", "solo corte de cabello", "corte de pelo", "corte básico", "corte de cabello"],
    description: "Corte desvanecido y corte con tijera arriba",
    duration: parseInt(process.env.SERVICE_SIMPLE_CUT_DURATION) || 30, // minutos
    price: parseInt(process.env.SERVICE_SIMPLE_CUT_PRICE) || 20000, // pesos colombianos
    emoji: "✂️"
  },
  CUT_WITH_BEARD: {
    id: 2,
    name: "Corte con barba",
    aliases: ["corte y barba", "corte completo", "corte con perfilado de barba", "corte con barba", "corte + barba"],
    description: "corte completo con desvanecido, tijera arriba, diseño y perfilación de barba",
    duration: parseInt(process.env.SERVICE_CUT_WITH_BEARD_DURATION) || 45, // minutos
    price: parseInt(process.env.SERVICE_CUT_WITH_BEARD_PRICE) || 25000, // pesos colombianos
    emoji: "🧔"
  },
  SIMPLE_SERVICE: {
    id: 3,
    name: "Servicio sencillo",
    aliases: ["servicio sencillo", "marcar barba", "bases", "perfilado rápido", "retoque", "servicio básico", "solo barba"],
    description: "Marcarse la barba, hacerse unas bases a los lados, marcarse el cerquillo",
    duration: parseInt(process.env.SERVICE_SIMPLE_SERVICE_DURATION) || 15, // minutos
    price: parseInt(process.env.SERVICE_SIMPLE_SERVICE_PRICE) || 12000, // pesos colombianos
    emoji: "🪒"
  }
};

// Horarios de atención
export const BUSINESS_HOURS = {
  // Horario general
  GENERAL_OPEN: process.env.BUSINESS_HOURS_GENERAL_OPEN || "09:30",
  GENERAL_CLOSE: process.env.BUSINESS_HOURS_GENERAL_CLOSE || "20:00",
  GENERAL_LAST_APPOINTMENT: process.env.BUSINESS_HOURS_GENERAL_LAST || "19:30",
  
  // Horario extra (precio doble)
  EXTRA_OPEN: process.env.BUSINESS_HOURS_EXTRA_OPEN || "07:00",
  EXTRA_CLOSE: process.env.BUSINESS_HOURS_EXTRA_CLOSE || "22:00",
  EXTRA_LAST_APPOINTMENT: process.env.BUSINESS_HOURS_EXTRA_LAST || "21:30",
  
  // Horario de descanso (no citas)
  BREAK_START: process.env.BUSINESS_HOURS_BREAK_START || "13:00",
  BREAK_END: process.env.BUSINESS_HOURS_BREAK_END || "14:00",
  
  // Configuración general
  TIMEZONE: process.env.GOOGLE_TIMEZONE || "America/Bogota"
};

// Estados de conversación
export const CONVERSATION_STATES = {
  MENU: "menu",
  SELECTING_BARBER: "selecting_barber",
  SELECTING_SERVICE: "selecting_service",
  SELECTING_SCHEDULE_TYPE: "selecting_schedule_type",
  COLLECTING_NAME: "collecting_name",
  COLLECTING_PHONE: "collecting_phone",
  SELECTING_DATE: "selecting_date",
  SELECTING_TIME: "selecting_time",
  CONFIRMING: "confirming",
  AMBIGUOUS_DATE: "ambiguous_date",
  RESCHEDULING: "rescheduling",
  CANCELLING: "cancelling"
};

// Barberos disponibles
export const BARBERS = {
  BARBER_1: {
    id: 1,
    name: process.env.BARBER_1_NAME || "Mauricio",
    calendarId: process.env.BARBER_1_CALENDAR_ID || "Citas - Mauricio",
    emoji: "👨‍💼"
  },
  BARBER_2: {
    id: 2,
    name: process.env.BARBER_2_NAME || "Stiven", 
    calendarId: process.env.BARBER_2_CALENDAR_ID || "Citas - Stiven",
    emoji: "👨‍💼"
  }
};

// Función para obtener el menú principal
export function getMainMenu() {
  const businessName = process.env.BUSINESS_NAME || "Cabelleros";
  
  return `¡Hola! 👋 Bienvenido a ${businessName}💈
Soy tu asistente virtual y estoy aquí para ayudarte a reservar tu turno o responder tus dudas.

¿Qué te gustaría hacer hoy?:

1. Agendar una cita ✂️
2. Conocer nuestros servicios y precios 📋

📌 Nota: Nuestro horario de atención es de ${BUSINESS_HOURS.OPEN} a.m. a ${BUSINESS_HOURS.CLOSE} p.m.

Por favor, responde con el número de la opción que prefieras.`;
}

// Función para obtener saludo inteligente con IA
export function getSmartGreeting() {
  const businessName = process.env.BUSINESS_NAME || "Caballeros";
  
  return `¡Hola! 👋 Bienvenido a ${businessName}💈

Soy tu asistente virtual y puedo ayudarte a agendar tu cita fácil y rápido.

📋 Servicios:

${SERVICES.SIMPLE_CUT.emoji} ${SERVICES.SIMPLE_CUT.name} - $${SERVICES.SIMPLE_CUT.price.toLocaleString()} (${SERVICES.SIMPLE_CUT.duration} min)
${SERVICES.CUT_WITH_BEARD.emoji} ${SERVICES.CUT_WITH_BEARD.name} - $${SERVICES.CUT_WITH_BEARD.price.toLocaleString()} (${SERVICES.CUT_WITH_BEARD.duration} min)
${SERVICES.SIMPLE_SERVICE.emoji} ${SERVICES.SIMPLE_SERVICE.name} - $${SERVICES.SIMPLE_SERVICE.price.toLocaleString()} (${SERVICES.SIMPLE_SERVICE.duration} min)

💈 Barberos: ${BARBERS.BARBER_1.name} | ${BARBERS.BARBER_2.name}

⏰ Horario:

💈 Lun a Sáb: ${BUSINESS_HOURS.GENERAL_OPEN} – ${BUSINESS_HOURS.GENERAL_CLOSE}
🌙 Extra: ${BUSINESS_HOURS.EXTRA_OPEN} – ${BUSINESS_HOURS.EXTRA_CLOSE} (precio doble)
🍽 Almuerzo: ${BUSINESS_HOURS.BREAK_START} – ${BUSINESS_HOURS.BREAK_END}

🎯 Solo dime qué servicio quieres y con quién, y te ayudo con el resto.

También puedo ayudarte a reagendar o cancelar una cita.

¿En qué puedo ayudarte hoy?`;
}

// Función para obtener el menú de barberos
export function getBarberMenu() {
  return `👨‍💼 Selecciona tu barbero preferido:

1. ${BARBERS.BARBER_1.emoji} ${BARBERS.BARBER_1.name}
2. ${BARBERS.BARBER_2.emoji} ${BARBERS.BARBER_2.name}

Por favor, responde con el número del barbero que prefieras:`;
}

// Función para obtener el menú de barberos con lenguaje natural (para IA)
export function getBarberMenuNatural() {
  return `👨‍💼 BARBEROS DISPONIBLES:

${BARBERS.BARBER_1.emoji} ${BARBERS.BARBER_1.name}
${BARBERS.BARBER_2.emoji} ${BARBERS.BARBER_2.name}

¿Con cuál barbero quieres agendar tu cita? Puedes decirme el nombre directamente.`;
}

// Función para mostrar horarios disponibles con lenguaje natural (para IA)
export function getTimeSlotsNatural(timeSlots) {
  if (timeSlots.length === 0) {
    return "❌ No hay horarios disponibles para esta fecha.";
  }
  
  return `🕐 HORARIOS DISPONIBLES:

${timeSlots.map(slot => `• ${slot}`).join('\n')}

¿A qué hora te gustaría la cita? Puedes decirme la hora directamente.`;
}

// Función para obtener el menú de servicios
export function getServiceMenu() {
  return `✂️ Selecciona el servicio que deseas:

1. ${SERVICES.SIMPLE_CUT.emoji} ${SERVICES.SIMPLE_CUT.name} - $${SERVICES.SIMPLE_CUT.price.toLocaleString()} COP
2. ${SERVICES.CUT_WITH_BEARD.emoji} ${SERVICES.CUT_WITH_BEARD.name} - $${SERVICES.CUT_WITH_BEARD.price.toLocaleString()} COP  
3. ${SERVICES.SIMPLE_SERVICE.emoji} ${SERVICES.SIMPLE_SERVICE.name} - $${SERVICES.SIMPLE_SERVICE.price.toLocaleString()} COP

Por favor, responde con el número del servicio que prefieras:`;
}

// Función para obtener el menú de barberos con lista
export function getBarberMenuWithButtons() {
  return {
    text: `👨‍💼 Selecciona tu barbero preferido:`,
    buttons: [
      {
        id: 'barber_1',
        title: `${BARBERS.BARBER_1.emoji} ${BARBERS.BARBER_1.name}`,
        description: 'Barbero especializado en cortes modernos'
      },
      {
        id: 'barber_2', 
        title: `${BARBERS.BARBER_2.emoji} ${BARBERS.BARBER_2.name}`,
        description: 'Barbero con experiencia en estilos clásicos'
      }
    ]
  };
}

// Función para obtener el menú de servicios con lista
export function getServiceMenuWithButtons() {
  return {
    text: `✂️ Selecciona el servicio que deseas:`,
    buttons: [
      {
        id: 'service_1',
        title: `${SERVICES.SIMPLE_CUT.emoji} ${SERVICES.SIMPLE_CUT.name}`,
        description: `$${SERVICES.SIMPLE_CUT.price.toLocaleString()} COP - ${SERVICES.SIMPLE_CUT.duration} min`
      },
      {
        id: 'service_2',
        title: `${SERVICES.CUT_WITH_BEARD.emoji} ${SERVICES.CUT_WITH_BEARD.name}`,
        description: `$${SERVICES.CUT_WITH_BEARD.price.toLocaleString()} COP - ${SERVICES.CUT_WITH_BEARD.duration} min`
      },
      {
        id: 'service_3',
        title: `${SERVICES.SIMPLE_SERVICE.emoji} ${SERVICES.SIMPLE_SERVICE.name}`,
        description: `$${SERVICES.SIMPLE_SERVICE.price.toLocaleString()} COP - ${SERVICES.SIMPLE_SERVICE.duration} min`
      }
    ]
  };
}

// Función para obtener el menú principal con lista
export function getMainMenuWithButtons() {
  const businessName = process.env.BUSINESS_NAME || "Cabelleros";
  
  return {
    text: `¡Hola! 👋 Bienvenido a ${businessName}💈\n\nSoy tu asistente virtual y estoy aquí para ayudarte a reservar tu turno o responder tus dudas.\n\n¿Qué te gustaría hacer hoy?\n\n📌 Nota: Nuestro horario de atención es de ${BUSINESS_HOURS.OPEN} a.m. a ${BUSINESS_HOURS.CLOSE} p.m.`,
    buttons: [
      {
        id: 'book_appointment',
        title: '✂️ Agendar una cita',
        description: 'Reserva tu cita con nosotros'
      },
      {
        id: 'view_services',
        title: '📋 Ver servicios y precios',
        description: 'Conoce nuestros servicios disponibles'
      }
    ]
  };
}

// Función para obtener opciones de teléfono con lista

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

${SERVICES.SIMPLE_SERVICE.emoji} ${SERVICES.SIMPLE_SERVICE.name}
   ${SERVICES.SIMPLE_SERVICE.description}
   ⏱️ Duración: ${SERVICES.SIMPLE_SERVICE.duration} minutos
   💰 Precio: $${SERVICES.SIMPLE_SERVICE.price.toLocaleString()} COP

¿Te gustaría agendar alguno de estos servicios? Responde con el número de la opción que prefieras.`;
}

// Función para obtener servicio por ID
export function getServiceById(id) {
  return Object.values(SERVICES).find(service => service.id === parseInt(id));
}

// Función para obtener un barbero por ID
export function getBarberById(id) {
  return Object.values(BARBERS).find(barber => barber.id === parseInt(id));
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
      // Saltar horario de descanso (1:00 PM - 2:00 PM)
      const breakStart = parseInt(BUSINESS_HOURS.BREAK_START.split(':')[0]);
      const breakEnd = parseInt(BUSINESS_HOURS.BREAK_END.split(':')[0]);
      if (hour >= breakStart && hour < breakEnd) {
        continue;
      }
      
      // Validación adicional: si la cita se extiende durante el horario de descanso
      const slotEndHour = hour + Math.floor((minutes + serviceDuration) / 60);
      const slotEndMinute = (minutes + serviceDuration) % 60;
      
      // Verificar si la cita termina durante el horario de descanso
      if (slotEndHour > breakStart && slotEndHour < breakEnd) {
        continue;
      }
      
      // Verificar si la cita cruza el horario de descanso (empieza antes y termina después)
      if (hour < breakStart && slotEndHour > breakStart) {
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
      
      const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      // Solo agregar si no está ocupado
      if (!occupiedSlots.includes(timeString)) {
        slots.push(timeString);
        console.log(`🔍 DEBUG - Horario agregado: ${timeString}`);
      } else {
        console.log(`🔍 DEBUG - Horario ocupado: ${timeString}`);
      }
    }
  }
  
  return slots;
}

// Función para obtener opciones de tipo de horario
export function getScheduleTypeMenu() {
  return `🕐 TIPOS DE HORARIO DISPONIBLES:

🌅 HORARIO GENERAL
⏰ 9:30 AM - 8:00 PM (última cita 7:30 PM)
💰 Precio normal

🌙 HORARIO EXTRA
⏰ 7:00 AM - 10:00 PM (última cita 9:30 PM)
💰 Precio doble (para casos especiales)

¿Qué tipo de horario prefieres?`;
}

// Función para obtener menú de tipo de horario con lenguaje natural
export function getScheduleTypeMenuNatural() {
  return `🕐 TIPOS DE HORARIO DISPONIBLES:

🌅 HORARIO GENERAL
⏰ 9:30 AM - 8:00 PM (última cita 7:30 PM)
💰 Precio normal

🌙 HORARIO EXTRA
⏰ 7:00 AM - 10:00 PM (última cita 9:30 PM)
💰 Precio doble (para casos especiales)

¿Qué tipo de horario prefieres? Puedes decirme "general", "normal", "extra" o "especial".`;
}

// Función para calcular precio según tipo de horario
export function calculatePrice(service, scheduleType = 'general') {
  const basePrice = service.price;
  
  if (scheduleType === 'extra') {
    return basePrice * 2; // Precio doble para horario extra
  }
  
  return basePrice; // Precio normal para horario general
}

// Función para verificar si un horario está en horario de descanso
export function isBreakTime(time) {
  const breakStart = parseInt(BUSINESS_HOURS.BREAK_START.split(':')[0]);
  const breakEnd = parseInt(BUSINESS_HOURS.BREAK_END.split(':')[0]);
  const hour = parseInt(time.split(':')[0]);
  
  return hour >= breakStart && hour < breakEnd;
}

// Función para verificar si una cita cruza el horario de descanso
export function conflictsWithBreakTime(startTime, duration) {
  const breakStart = parseInt(BUSINESS_HOURS.BREAK_START.split(':')[0]);
  const breakEnd = parseInt(BUSINESS_HOURS.BREAK_END.split(':')[0]);
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const endHour = startHour + Math.floor((startMinute + duration) / 60);
  const endMinute = (startMinute + duration) % 60;
  
  // Verificar si la cita empieza durante el horario de descanso
  if (startHour >= breakStart && startHour < breakEnd) {
    return true;
  }
  
  // Verificar si la cita termina durante el horario de descanso
  if (endHour > breakStart && endHour < breakEnd) {
    return true;
  }
  
  // Verificar si la cita cruza el horario de descanso (empieza antes y termina después)
  if (startHour < breakStart && endHour > breakStart) {
    return true;
  }
  
  return false;
}

// Función para detectar si un horario es extra (fuera del horario general)
export function isExtraScheduleTime(startTime) {
  const extraOpen = BUSINESS_HOURS.EXTRA_OPEN.split(':').map(Number); // [7, 0]
  const generalOpen = BUSINESS_HOURS.GENERAL_OPEN.split(':').map(Number); // [9, 30]
  const generalClose = BUSINESS_HOURS.GENERAL_CLOSE.split(':').map(Number); // [20, 0]
  const extraClose = BUSINESS_HOURS.EXTRA_CLOSE.split(':').map(Number); // [22, 0]
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  
  // Horas extra de la mañana: 7:00 AM - 9:30 AM (hasta el inicio del horario general)
  const extraMorningStart = extraOpen[0] * 60 + extraOpen[1]; // 7:00 = 420 minutos
  const extraMorningEnd = generalOpen[0] * 60 + generalOpen[1]; // 9:30 = 570 minutos
  
  // Horas extra de la noche: 8:00 PM - 10:00 PM (después del final del horario general)
  const extraNightStart = generalClose[0] * 60 + generalClose[1]; // 20:00 = 1200 minutos
  const extraNightEnd = extraClose[0] * 60 + extraClose[1]; // 22:00 = 1320 minutos
  
  // Es horario extra si está en el rango de mañana (7:00-9:30) o noche (20:00-22:00)
  return (startMinutes >= extraMorningStart && startMinutes < extraMorningEnd) ||
         (startMinutes >= extraNightStart && startMinutes < extraNightEnd);
}

// Función para identificar servicio por alias
export function identifyService(userInput) {
  userInput = userInput.toLowerCase();
  let bestMatch = null;
  let bestMatchLength = 0;

  for (const key in SERVICES) {
    const service = SERVICES[key];
    for (const alias of service.aliases) {
      const lowerAlias = alias.toLowerCase();
      if (userInput.includes(lowerAlias)) {
        // Si el input del usuario es una coincidencia exacta del alias, es la mejor coincidencia
        if (userInput === lowerAlias) {
          return service; // Coincidencia exacta, retornar inmediatamente
        }
        // Si el alias actual es más largo que la mejor coincidencia anterior,
        // o si es una frase más específica, actualizar bestMatch.
        // Esto prioriza "corte con barba" sobre "corte"
        if (lowerAlias.length > bestMatchLength) {
          bestMatch = service;
          bestMatchLength = lowerAlias.length;
        }
      }
    }
  }
  return bestMatch; // Retornar la coincidencia más específica (más larga) encontrada
}

// Función para identificar barbero por nombre
export function identifyBarber(userInput) {
  userInput = userInput.toLowerCase();
  for (const key in BARBERS) {
    const barber = BARBERS[key];
    if (userInput.includes(barber.name.toLowerCase())) {
      return barber;
    }
  }
  return null; // No se encontró
}

// Función para obtener todos los alias de servicios para la IA
export function getAllServiceAliases() {
  const aliases = [];
  for (const key in SERVICES) {
    const service = SERVICES[key];
    aliases.push(...service.aliases);
  }
  return aliases;
}

// Función para obtener todos los nombres de barberos para la IA
export function getAllBarberNames() {
  const names = [];
  for (const key in BARBERS) {
    const barber = BARBERS[key];
    names.push(barber.name);
  }
  return names;
}
