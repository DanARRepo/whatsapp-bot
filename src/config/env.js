/**
 * Validación de variables de entorno
 * Verifica que todas las variables necesarias estén configuradas
 */

/**
 * Valida las variables de entorno críticas
 * @throws {Error} Si alguna variable crítica falta
 */
export function validateEnv() {
  const errors = [];
  const warnings = [];

  // Variables críticas (deben estar presentes)
  const criticalVars = {
    'GOOGLE_TIMEZONE': process.env.GOOGLE_TIMEZONE || 'America/Bogota',
  };

  // Variables opcionales pero recomendadas
  const recommendedVars = {
    'BUSINESS_NAME': process.env.BUSINESS_NAME || 'Caballeros',
    'PORT': process.env.PORT || '3000',
  };

  // Validar proveedor de IA
  const aiProvider = process.env.AI_PROVIDER?.toLowerCase() || 'gemini';
  if (aiProvider === 'gemini') {
    if (process.env.GEMINI_ENABLED === 'true' && !process.env.GEMINI_API_KEY) {
      warnings.push('GEMINI_ENABLED está en true pero GEMINI_API_KEY no está configurada');
    }
  } else if (aiProvider === 'perplexity') {
    if (process.env.PERPLEXITY_ENABLED === 'true' && !process.env.PERPLEXITY_API_KEY) {
      warnings.push('PERPLEXITY_ENABLED está en true pero PERPLEXITY_API_KEY no está configurada');
    }
  }

  // Mostrar advertencias
  if (warnings.length > 0) {
    console.warn('⚠️ Advertencias de configuración:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  // Lanzar errores críticos
  if (errors.length > 0) {
    console.error('❌ Errores de configuración:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Variables de entorno críticas faltantes. Verifica tu archivo .env');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Obtiene el valor de una variable de entorno con un valor por defecto
 * @param {string} key - Nombre de la variable
 * @param {any} defaultValue - Valor por defecto
 * @returns {any} Valor de la variable o el valor por defecto
 */
export function getEnv(key, defaultValue = null) {
  return process.env[key] || defaultValue;
}

/**
 * Obtiene un número de una variable de entorno
 * @param {string} key - Nombre de la variable
 * @param {number} defaultValue - Valor por defecto
 * @returns {number} Valor numérico
 */
export function getEnvNumber(key, defaultValue = 0) {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

/**
 * Obtiene un booleano de una variable de entorno
 * @param {string} key - Nombre de la variable
 * @param {boolean} defaultValue - Valor por defecto
 * @returns {boolean} Valor booleano
 */
export function getEnvBoolean(key, defaultValue = false) {
  const value = process.env[key];
  if (value === undefined || value === null) return defaultValue;
  return value === 'true' || value === '1';
}
