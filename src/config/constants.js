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

// Mensajes comunes
export const MESSAGES = {
  GREETINGS: {
    WELCOME: (businessName) => `¡Hola! 👋 Bienvenido a ${businessName}💈`,
    HELP: "¿En qué puedo ayudarte hoy?"
  },
  ERRORS: {
    INVALID_DATE: "❌ No puedes agendar citas para fechas pasadas. Por favor, selecciona una fecha futura.",
    INVALID_TIME: "❌ El horario seleccionado no está disponible. Por favor, elige otro horario.",
    BREAK_TIME: "❌ No se pueden agendar citas durante el horario de almuerzo (13:00 - 14:00). Por favor, selecciona otro horario.",
    TIME_OCCUPIED: (time, barberName) => `❌ Lo siento, el horario ${time} ya está ocupado para ${barberName}.\n\nPor favor, selecciona otro horario disponible.`,
    NO_SLOTS: "❌ No hay horarios disponibles para esta fecha.\n\nPor favor, selecciona otra fecha.",
    PROCESSING_ERROR: "❌ Ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.",
    TOKEN_EXPIRED: "❌ Error de autenticación con Google Calendar. Por favor, contacta al administrador para re-autorizar la aplicación."
  },
  CONFIRMATION: {
    YES: "✅ SÍ",
    NO: "❌ NO"
  }
};
