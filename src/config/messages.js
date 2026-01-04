import { SERVICES } from '../data/services.js';
import { BARBERS } from '../data/barbers.js';
import { BUSINESS_HOURS } from './business.js';

// Función para obtener el menú principal
export function getMainMenu() {
  const businessName = process.env.BUSINESS_NAME || "Cabelleros";
  
  return `¡Hola! 👋 Bienvenido a ${businessName}💈
Soy tu asistente virtual y estoy aquí para ayudarte a reservar tu turno o responder tus dudas.

¿Qué te gustaría hacer hoy?:

1. Agendar una cita ✂️
2. Conocer nuestros servicios y precios 📋

📌 Nota: Nuestro horario de atención es de ${BUSINESS_HOURS.GENERAL_OPEN} a.m. a ${BUSINESS_HOURS.GENERAL_CLOSE} p.m.

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
    text: `¡Hola! 👋 Bienvenido a ${businessName}💈\n\nSoy tu asistente virtual y estoy aquí para ayudarte a reservar tu turno o responder tus dudas.\n\n¿Qué te gustaría hacer hoy?\n\n📌 Nota: Nuestro horario de atención es de ${BUSINESS_HOURS.GENERAL_OPEN} a.m. a ${BUSINESS_HOURS.GENERAL_CLOSE} p.m.`,
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
