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

// Función para obtener un barbero por ID
export function getBarberById(id) {
  return Object.values(BARBERS).find(barber => barber.id === parseInt(id));
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

// Función para obtener todos los nombres de barberos para la IA
export function getAllBarberNames() {
  const names = [];
  for (const key in BARBERS) {
    const barber = BARBERS[key];
    names.push(barber.name);
  }
  return names;
}
