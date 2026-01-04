/**
 * Clase base abstracta para proveedores de IA
 * Todos los proveedores (Gemini, Perplexity, etc.) deben extender esta clase
 */

import { getAllServiceAliases, getAllBarberNames } from '../services.js';

export default class BaseAIProvider {
  constructor() {
    if (this.constructor === BaseAIProvider) {
      throw new Error('BaseAIProvider es una clase abstracta y no puede ser instanciada directamente');
    }
    
    this.client = null;
    this.isInitialized = false;
  }

  /**
   * Nombre del proveedor (para logs)
   * @returns {string}
   */
  get name() {
    throw new Error('El método "name" debe ser implementado');
  }

  /**
   * Inicializa el cliente de la API
   * @throws {Error} Si la API key no está configurada
   */
  initialize() {
    throw new Error('El método "initialize" debe ser implementado');
  }

  /**
   * Prueba la conexión con la API
   * @returns {Promise<boolean>} true si la conexión es exitosa
   */
  async testConnection() {
    throw new Error('El método "testConnection" debe ser implementado');
  }

  /**
   * Procesa un mensaje en lenguaje natural y extrae información estructurada
   * @param {string} message - Mensaje del usuario
   * @param {Object} conversationState - Estado actual de la conversación
   * @returns {Promise<Object|null>} Objeto JSON con la información extraída o null si falla
   */
  async processNaturalLanguage(message, conversationState) {
    throw new Error('El método "processNaturalLanguage" debe ser implementado');
  }

  /**
   * Valida si una respuesta de IA es confiable
   * @param {Object} aiResponse - Respuesta de la IA
   * @returns {boolean} true si la respuesta es confiable
   */
  isResponseReliable(aiResponse) {
    return aiResponse && 
           aiResponse.confidence > 0.7 && 
           aiResponse.intent !== 'other';
  }

  /**
   * Genera el prompt base para el procesamiento de lenguaje natural
   * Este prompt es compartido entre todos los proveedores
   * @param {string} message - Mensaje del usuario
   * @param {Object} conversationState - Estado de la conversación
   * @returns {string} Prompt formateado
   */
  generatePrompt(message, conversationState) {
    return `
    Eres un asistente de una barbería llamada "Cabelleros". Analiza el mensaje del usuario y extrae información para agendar una cita.
    
    INFORMACIÓN DISPONIBLE:
    - Barberos: ${getAllBarberNames().join(', ')}
    - Servicios y sus alias: 
      * "Corte de cabello" (ID: 1) - $20,000 COP - 30 min
        Alias: ${getAllServiceAliases().filter(alias => alias.includes('corte') && !alias.includes('barba')).join(', ')}
      * "Corte con barba" (ID: 2) - $25,000 COP - 45 min  
        Alias: ${getAllServiceAliases().filter(alias => (alias.includes('corte') && alias.includes('barba')) || alias.includes('completo')).join(', ')}
      * "Servicio sencillo" (ID: 3) - $12,000 COP - 15 min
        Alias: ${getAllServiceAliases().filter(alias => alias.includes('servicio') || (alias.includes('barba') && !alias.includes('corte'))).join(', ')}
    - Horario: 8:00 AM - 7:30 PM, Lunes a Sábado
    - Fecha actual: ${new Date().toLocaleDateString('es-CO')} (Colombia - UTC-5)
    - Día de la semana actual: ${new Date().toLocaleDateString('es-CO', { weekday: 'long' })}
    - Zona horaria: Colombia (UTC-5)
    
    ESTADO ACTUAL DE LA CONVERSACIÓN: ${conversationState.state}
    
    INFORMACIÓN YA CONFIRMADA:
    - Barbero seleccionado: ${conversationState.selectedBarber ? `${conversationState.selectedBarber.name} (${conversationState.selectedBarber.emoji})` : 'Ninguno'}
    - Servicio seleccionado: ${conversationState.selectedService ? `${conversationState.selectedService.name} (${conversationState.selectedService.emoji})` : 'Ninguno'}
    - Fecha seleccionada: ${conversationState.selectedDate || 'Ninguna'}
    - Hora seleccionada: ${conversationState.selectedTime || 'Ninguna'}
    - Nombre del cliente: ${conversationState.clientName || 'No proporcionado'}
    - Teléfono del cliente: ${conversationState.clientPhone || 'No proporcionado'}
    
    CRÍTICO: Si el estado es "selecting_barber" y el usuario pregunta "cuales hay?", "quienes hay?", etc., SIEMPRE responde con "intent": "ask_barbers"
    CRÍTICO: Si el estado es "selecting_service" y el usuario pregunta "cuales hay?", "que hay?", etc., SIEMPRE responde con "intent": "ask_services"
    
    MENSAJE DEL USUARIO: "${message}"
    
    INTENCIONES POSIBLES:
    - "greeting": Saludos simples como "hola", "buenos días", "hey", "buenas tardes", "buenas noches", "buenas", "saludos", "inicio", "menu", "empezar", "comenzar", "nuevo", "otra vez", "de nuevo", "viejo", "socio", "amigo"
    - "book_appointment": Quiere agendar una cita (puede ser específico o general)
    - "ask_services": Pregunta sobre servicios, precios, qué tienen
    - "ask_prices": Pregunta específicamente sobre precios
    - "other": No se puede determinar la intención
    
    INSTRUCCIONES:
    1. Identifica la intención del usuario
    2. Extrae información de barbero, servicio, fecha y hora si está presente
    3. Convierte fechas naturales a formato DD/MM/YYYY
    4. Convierte horas naturales a formato HH:MM (24h)
    5. Si no hay información clara, marca como null
    6. Para saludos simples, marca como "greeting"
    7. Para cualquier mención de agendar, reservar, cita, marca como "book_appointment"
    8. IMPORTANTE: Si el usuario menciona un barbero específico (${getAllBarberNames().join(' o ')}), extrae esa información correctamente
    9. IMPORTANTE: Si el usuario menciona un servicio específico, usa los alias para identificarlo correctamente
    10. IMPORTANTE: Si el usuario menciona fecha y hora, extrae esa información correctamente
    11. CRÍTICO: Para servicios, busca en los alias. Por ejemplo: "corte" = "Corte de cabello", "corte y barba" = "Corte con barba", "marcar barba" = "Servicio sencillo"
    12. CRÍTICO: Para fechas relativas como "próximo martes", "mañana", "pasado mañana", calcula correctamente basándote en la fecha actual de Colombia
    13. CRÍTICO: "próximo martes" significa el martes de la próxima semana, no el martes de esta semana si ya pasó
    14. CRÍTICO: "mañana" es el día siguiente a la fecha actual
    15. CRÍTICO: "pasado mañana" es dos días después de la fecha actual
    16. CRÍTICO: Si el usuario menciona solo hora sin fecha (ej: "a las 2", "a las 3 de la tarde"), asume que es para HOY si la hora es futura, o para MAÑANA si la hora ya pasó
    17. CRÍTICO: Si menciona "hoy" + hora, calcula la fecha de hoy
    18. CRÍTICO: Si menciona "mañana" + hora, calcula la fecha de mañana
    19. CRÍTICO: Si menciona solo hora y es muy temprano (antes de las 8 AM), asume que es para mañana
    20. CRÍTICO: Si ya hay información confirmada en el estado (barbero, servicio, fecha, hora), ÚSALA en lugar de extraerla del mensaje
    21. CRÍTICO: Si el usuario solo menciona una hora (ej: "a las 10"), pero ya hay barbero y servicio confirmados, solo actualiza la hora y mantén el resto
    22. CRÍTICO: Si el usuario solo menciona una fecha, pero ya hay barbero y servicio confirmados, solo actualiza la fecha y mantén el resto
    23. CRÍTICO: Solo marca como null los campos que realmente no están disponibles en el estado actual
    24. DETECCIÓN DE TELÉFONO: Si el usuario dice algo como "usa mi numero", "usar mi número", "mi numero", "el mismo numero", "el actual", "este numero", "el de whatsapp", etc., marca "use_current_phone": true
    25. DETECCIÓN DE TELÉFONO: Si el usuario dice algo como "otro numero", "diferente", "nuevo numero", "registrar diferente", etc., marca "use_current_phone": false
    26. DETECCIÓN DE TELÉFONO: Si no hay contexto de teléfono, marca "use_current_phone": null
    27. PREGUNTAS SOBRE BARBEROS: Si el usuario pregunta "quienes hay?", "que barberos hay?", "cuales barberos?", "quienes estan?", "barberos disponibles?", "cuales hay?" Y el estado actual es "selecting_barber", responde con "intent": "ask_barbers" y MANTÉN toda la información ya confirmada (barber, service, date, time, name, phone) sin cambiarla
    28. PREGUNTAS SOBRE SERVICIOS: Si el usuario pregunta "que servicios hay?", "cuales servicios?", "servicios disponibles?", "que ofrecen?", "cuales hay?" Y el estado actual es "selecting_service", responde con "intent": "ask_services" y MANTÉN toda la información ya confirmada (barber, service, date, time, name, phone) sin cambiarla
    29. CRÍTICO: Para preguntas informativas (ask_barbers, ask_services, ask_prices), NUNCA cambies o elimines información ya confirmada. Solo cambia el intent y mantén todos los demás campos exactamente como están en el estado actual
    30. DETECCIÓN DE TIPO DE HORARIO: El sistema detecta automáticamente si un horario es "extra" basándose en la hora (7:00 AM - 9:29 AM o 8:00 PM - 10:00 PM). NO esperes que el usuario mencione "horario extra" - el sistema lo detecta y advierte al usuario sobre el precio doble.
    31. DETECCIÓN DE TIPO DE HORARIO: Los horarios "general" son de 9:30 AM a 8:00 PM. El sistema detecta automáticamente el tipo de horario basándose en la hora seleccionada, no en palabras del usuario.
    32. DETECCIÓN DE TIPO DE HORARIO: El sistema detecta automáticamente el tipo de horario basándose en la hora. NUNCA incluyas "scheduleType" en needs_info. Siempre marca "scheduleType": null y deja que el sistema lo detecte automáticamente.
    33. REAGENDAR CITA: Si el usuario dice "cambiar cita", "reagendar", "modificar cita", "cambiar horario", "reagendar cita", "cambiar fecha", "cambiar hora", etc., marca "intent": "reschedule"
    34. CANCELAR CITA: Si el usuario dice "cancelar cita", "cancelar", "eliminar cita", "borrar cita", "no quiero la cita", etc., marca "intent": "cancel"
    
    Responde SOLO en formato JSON válido con esta estructura exacta:
    {
      "intent": "book_appointment" | "greeting" | "ask_services" | "ask_prices" | "ask_barbers" | "phone_choice" | "reschedule" | "cancel" | "other",
      "barber": "${getAllBarberNames().join('" | "')}" | null,
      "service": "Corte de cabello" | "Corte con barba" | "Servicio sencillo" | null,
      "date": "DD/MM/YYYY" | null,
      "time": "HH:MM" | null,
      "natural_date": "descripción natural de la fecha" | null,
      "natural_time": "descripción natural de la hora" | null,
      "ambiguous_date": true | false,
      "use_current_phone": true | false | null,
      "scheduleType": "general" | "extra" | null,
      "confidence": 0.0-1.0,
      "needs_info": ["barber", "service", "date", "time", "name", "phone"]
    }
  `;
  }

  /**
   * Extrae el JSON de una respuesta de texto de la IA
   * @param {string} responseText - Texto de respuesta de la IA
   * @returns {Object|null} Objeto JSON parseado o null si falla
   */
  extractJSON(responseText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error(`❌ [${this.name}] Error parseando JSON:`, error.message);
      return null;
    }
  }

  /**
   * Log de información del proveedor
   * @param {string} level - Nivel de log (info, error, warn)
   * @param {string} message - Mensaje a loguear
   */
  log(level, message) {
    const prefix = `🤖 [${this.name}]`;
    switch (level) {
      case 'error':
        console.error(`${prefix} ❌ ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ⚠️ ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }
}
