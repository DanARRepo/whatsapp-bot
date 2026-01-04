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

// Función para validar horario de atención
export function isWithinBusinessHours(time) {
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    timeZone: BUSINESS_HOURS.TIMEZONE 
  });
  
  return currentTime >= BUSINESS_HOURS.GENERAL_OPEN && currentTime <= BUSINESS_HOURS.GENERAL_CLOSE;
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

// Función para calcular precio según tipo de horario
export function calculatePrice(service, scheduleType = 'general') {
  const basePrice = service.price;
  
  if (scheduleType === 'extra') {
    return basePrice * 2; // Precio doble para horario extra
  }
  
  return basePrice; // Precio normal para horario general
}
