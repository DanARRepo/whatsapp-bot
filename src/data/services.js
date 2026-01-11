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

// Función para obtener servicio por ID
export function getServiceById(id) {
  return Object.values(SERVICES).find(service => service.id === parseInt(id));
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

// Función para obtener todos los alias de servicios para la IA
export function getAllServiceAliases() {
  const aliases = [];
  for (const key in SERVICES) {
    const service = SERVICES[key];
    aliases.push(...service.aliases);
  }
  return aliases;
}
