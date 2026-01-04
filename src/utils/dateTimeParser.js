/**
 * Utilidades para parsear fechas y horas en lenguaje natural (español)
 * Independiente del proveedor de IA
 */

/**
 * Formatea una fecha al formato DD/MM/YYYY
 * @param {Date} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
export function formatDate(date) {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Mapeo de días de la semana en español a números (0 = domingo, 1 = lunes, etc.)
 */
const DAY_MAP = {
  'lunes': 1, 'martes': 2, 'miércoles': 3, 'miercoles': 3,
  'jueves': 4, 'viernes': 5, 'sábado': 6, 'sabado': 6, 'domingo': 0
};

/**
 * Parsea una cadena de texto con fecha natural en español
 * @param {string} dateString - Texto con la fecha (ej: "mañana", "próximo lunes", "pasado mañana")
 * @returns {string|null} Fecha en formato DD/MM/YYYY o null si no se puede parsear
 */
export function parseNaturalDate(dateString) {
  if (!dateString) return null;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const lowerDate = dateString.toLowerCase();
  
  // "hoy"
  if (lowerDate.includes('hoy')) {
    return formatDate(today);
  }
  
  // "mañana" (solo si no contiene "para el" o días de la semana)
  if ((lowerDate.includes('mañana') || lowerDate.includes('manana')) && 
      !lowerDate.includes('para el') && 
      !Object.keys(DAY_MAP).some(day => lowerDate.includes(day))) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDate(tomorrow);
  }
  
  // "pasado mañana"
  if (lowerDate.includes('pasado mañana') || lowerDate.includes('pasado manana')) {
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    return formatDate(dayAfterTomorrow);
  }
  
  // Días de la semana
  for (const [day, dayNum] of Object.entries(DAY_MAP)) {
    if (lowerDate.includes(day)) {
      const daysUntil = (dayNum - today.getDay() + 7) % 7;
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + (daysUntil === 0 ? 7 : daysUntil));
      return formatDate(targetDate);
    }
  }
  
  // "próximo" + día
  if (lowerDate.includes('próximo') || lowerDate.includes('proximo')) {
    for (const [day, dayNum] of Object.entries(DAY_MAP)) {
      if (lowerDate.includes(day)) {
        const daysUntil = (dayNum - today.getDay() + 7) % 7;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + (daysUntil === 0 ? 7 : daysUntil));
        return formatDate(targetDate);
      }
    }
  }
  
  return null;
}

/**
 * Parsea una cadena de texto con hora natural en español
 * @param {string} timeString - Texto con la hora (ej: "3 de la tarde", "10 am", "3 y media")
 * @returns {string|null} Hora en formato HH:MM (24h) o null si no se puede parsear
 */
export function parseNaturalTime(timeString) {
  if (!timeString) return null;
  
  const lowerTime = timeString.toLowerCase();
  
  // Patrones comunes
  const patterns = [
    // "3 de la tarde", "3 pm", "15:00"
    /(\d{1,2})\s*(?:de la tarde|pm|p\.m\.)/,
    // "10 de la mañana", "10 am", "10:00"
    /(\d{1,2})\s*(?:de la mañana|am|a\.m\.)/,
    // "3:30", "15:30"
    /(\d{1,2}):(\d{2})/,
    // "11 y media", "3 y media"
    /(\d{1,2})\s*y\s*media/,
    // "11 y cuarto", "3 y cuarto"
    /(\d{1,2})\s*y\s*cuarto/,
    // "11 y 15", "3 y 15"
    /(\d{1,2})\s*y\s*(\d{1,2})/
  ];
  
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const match = lowerTime.match(pattern);
    if (match) {
      let hour = parseInt(match[1]);
      let minute = 0;
      
      // Determinar los minutos según el patrón
      if (i === 2) { // Patrón "3:30", "15:30"
        minute = match[2] ? parseInt(match[2]) : 0;
      } else if (i === 3) { // Patrón "11 y media"
        minute = 30;
      } else if (i === 4) { // Patrón "11 y cuarto"
        minute = 15;
      } else if (i === 5) { // Patrón "11 y 15"
        minute = match[2] ? parseInt(match[2]) : 0;
      }
      
      // Convertir a 24h si es PM
      if (lowerTime.includes('tarde') || lowerTime.includes('pm') || lowerTime.includes('p.m.')) {
        if (hour !== 12) hour += 12;
      } else if (lowerTime.includes('mañana') || lowerTime.includes('am') || lowerTime.includes('a.m.')) {
        if (hour === 12) hour = 0;
      }
      
      // Para horarios sin especificar AM/PM, asumir horario laboral (8 AM - 8 PM)
      if (!lowerTime.includes('tarde') && !lowerTime.includes('pm') && !lowerTime.includes('p.m.') && 
          !lowerTime.includes('mañana') && !lowerTime.includes('am') && !lowerTime.includes('a.m.')) {
        // Si la hora está entre 1-8, asumir AM (mañana) para horarios de barbería
        if (hour >= 1 && hour <= 8) {
          // Mantener como AM (mañana)
        }
        // Si la hora es 9-11, asumir AM (mañana)
        // Si la hora es 12, mantener como 12 (mediodía)
      }
      
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }
  }
  
  return null;
}

/**
 * Parsea una cadena de texto que contiene fecha Y hora en lenguaje natural
 * @param {string} dateTimeString - Texto con fecha y hora (ej: "mañana a las 3 de la tarde")
 * @returns {{date: string|null, time: string|null}} Objeto con fecha y hora parseadas
 */
export function parseNaturalDateAndTime(dateTimeString) {
  if (!dateTimeString) return { date: null, time: null };
  
  const lowerString = dateTimeString.toLowerCase();
  
  // Intentar extraer la hora primero
  let extractedTime = null;
  
  // Patrones para extraer hora (ordenados por especificidad)
  const timePatterns = [
    /a las (\d{1,2}) y media de la (mañana|tarde|noche)/g,
    /a la (\d{1,2}) y media de la (mañana|tarde|noche)/g,
    /a las (\d{1,2}) de la (mañana|tarde|noche)/g,
    /a la (\d{1,2}) de la (mañana|tarde|noche)/g,
    /(\d{1,2}) y media de la (mañana|tarde|noche)/g,
    /(\d{1,2}) de la (mañana|tarde|noche)/g,
    /a las (\d{1,2}) y media/g,
    /a la (\d{1,2}) y media/g,
    /a las (\d{1,2})/g,
    /a la (\d{1,2})/g,
    /(\d{1,2}):(\d{2})/g,
    /(\d{1,2}) (am|pm)/g
  ];
  
  for (const pattern of timePatterns) {
    const match = lowerString.match(pattern);
    if (match) {
      const timeMatch = match[0];
      
      // Procesar patrones con "de la mañana/tarde/noche" explícito (más específicos primero)
      if (timeMatch.includes('de la')) {
        const hour = parseInt(timeMatch.match(/\d+/)[0]);
        const isMedia = timeMatch.includes('y media');
        let hour24 = hour;
        
        // Detectar período del día en el match mismo (más confiable)
        if (timeMatch.includes('tarde') || timeMatch.includes('noche')) {
          hour24 = hour + 12;
          if (hour === 12) hour24 = 12; // 12 PM = 12:00
        } else if (timeMatch.includes('mañana')) {
          if (hour === 12) hour24 = 0; // 12 AM = 00:00
          // hour24 ya es correcto para AM
        }
        
        const minute = isMedia ? 30 : 0;
        extractedTime = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
      // Procesar "a las 3 y media" o "a la 3 y media" (sin "de la")
      else if (timeMatch.includes('a las') || timeMatch.includes('a la')) {
        const hour = parseInt(timeMatch.match(/\d+/)[0]);
        const isMedia = timeMatch.includes('y media');
        
        if (hour >= 1 && hour <= 12) {
          // Convertir a formato 24h considerando horarios laborales
          let hour24 = hour;
          
          // Si especifica "mañana" en el contexto de la hora (no la fecha)
          if (lowerString.includes('de la mañana') || (lowerString.includes('mañana') && !lowerString.includes('mañana a las') && !lowerString.includes('mañana a la'))) {
            if (!lowerString.includes('de la tarde') && !lowerString.includes('de la noche')) {
              if (hour === 12) hour24 = 0; // 12 AM = 00:00
            }
          }
          // Si especifica "tarde" o "noche", usar PM
          else if (lowerString.includes('de la tarde') || lowerString.includes('de la noche') || 
                   (lowerString.includes('tarde') && !lowerString.includes('de la mañana')) ||
                   (lowerString.includes('noche') && !lowerString.includes('de la mañana'))) {
            hour24 = hour + 12;
            if (hour === 12) hour24 = 12; // 12 PM = 12:00
          }
          // Si NO especifica mañana/tarde/noche, asumir PM si la hora es 1-8
          else {
            if (hour >= 1 && hour <= 8) {
              hour24 = hour + 12;
            } else if (hour >= 9 && hour <= 12) {
              // Para 9-12, asumir AM (9 AM, 10 AM, etc.)
            }
          }
          
          const minute = isMedia ? 30 : 0;
          extractedTime = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }
      }
      // Procesar "3:30" o "15:30"
      else if (timeMatch.includes(':')) {
        const [hour, minute] = timeMatch.split(':');
        extractedTime = `${hour.padStart(2, '0')}:${minute}`;
      }
      // Procesar "3 de la tarde" (patrón simple sin "a las")
      else if (timeMatch.includes('de la') && !timeMatch.includes('a las') && !timeMatch.includes('a la')) {
        const hour = parseInt(timeMatch.match(/\d+/)[0]);
        let hour24 = hour;
        
        if (timeMatch.includes('tarde') || timeMatch.includes('noche')) {
          hour24 = hour + 12;
          if (hour === 12) hour24 = 12; // 12 PM = 12:00
        } else if (timeMatch.includes('mañana')) {
          if (hour === 12) hour24 = 0; // 12 AM = 00:00
        }
        
        extractedTime = `${hour24.toString().padStart(2, '0')}:00`;
      }
      // Procesar "3 PM" o "3 AM"
      else if (timeMatch.includes('am') || timeMatch.includes('pm')) {
        const hour = parseInt(timeMatch.match(/\d+/)[0]);
        let hour24 = hour;
        if (timeMatch.includes('pm') && hour !== 12) {
          hour24 = hour + 12;
        } else if (timeMatch.includes('am') && hour === 12) {
          hour24 = 0;
        }
        extractedTime = `${hour24.toString().padStart(2, '0')}:00`;
      }
      
      if (extractedTime) break;
    }
  }
  
  // Intentar extraer la fecha
  const extractedDate = parseNaturalDate(dateTimeString);
  
  return {
    date: extractedDate,
    time: extractedTime
  };
}
