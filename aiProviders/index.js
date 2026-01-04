/**
 * Factory para proveedores de IA
 * Permite cambiar entre diferentes proveedores mediante configuración
 */

import GeminiProvider from './GeminiProvider.js';
import PerplexityProvider from './PerplexityProvider.js';

// Registro de proveedores disponibles
const PROVIDERS = {
  gemini: GeminiProvider,
  perplexity: PerplexityProvider
};

// Instancia singleton del proveedor actual
let currentProvider = null;

/**
 * Obtiene el proveedor de IA configurado
 * @returns {BaseAIProvider} Instancia del proveedor
 */
export function getAIProvider() {
  if (currentProvider) {
    return currentProvider;
  }

  const providerName = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  
  const ProviderClass = PROVIDERS[providerName];
  
  if (!ProviderClass) {
    console.warn(`⚠️ Proveedor "${providerName}" no encontrado. Usando Gemini por defecto.`);
    currentProvider = new GeminiProvider();
  } else {
    currentProvider = new ProviderClass();
  }

  console.log(`🤖 Proveedor de IA: ${currentProvider.name}`);
  
  return currentProvider;
}

/**
 * Verifica si la IA está habilitada
 * @returns {boolean}
 */
export function isAIEnabled() {
  const provider = process.env.AI_PROVIDER || 'gemini';
  
  switch (provider.toLowerCase()) {
    case 'gemini':
      return process.env.GEMINI_ENABLED === 'true' && !!process.env.GEMINI_API_KEY;
    case 'perplexity':
      return process.env.PERPLEXITY_ENABLED === 'true' && !!process.env.PERPLEXITY_API_KEY;
    default:
      return false;
  }
}

/**
 * Procesa un mensaje con el proveedor de IA configurado
 * Función de conveniencia para mantener compatibilidad
 * @param {string} message - Mensaje del usuario
 * @param {Object} conversationState - Estado de la conversación
 * @returns {Promise<Object|null>} Respuesta de la IA
 */
export async function processNaturalLanguage(message, conversationState) {
  if (!isAIEnabled()) {
    console.log('⚠️ IA deshabilitada, usando flujo tradicional');
    return null;
  }

  const provider = getAIProvider();
  return await provider.processNaturalLanguage(message, conversationState);
}

/**
 * Valida si una respuesta de IA es confiable
 * Función de conveniencia para mantener compatibilidad
 * @param {Object} aiResponse - Respuesta de la IA
 * @returns {boolean}
 */
export function isAIResponseReliable(aiResponse) {
  const provider = getAIProvider();
  return provider.isResponseReliable(aiResponse);
}

/**
 * Prueba la conexión con el proveedor de IA
 * @returns {Promise<boolean>}
 */
export async function testAIConnection() {
  if (!isAIEnabled()) {
    console.log('⚠️ IA deshabilitada');
    return false;
  }

  const provider = getAIProvider();
  return await provider.testConnection();
}

/**
 * Reinicia el proveedor (útil para cambios de configuración)
 */
export function resetProvider() {
  currentProvider = null;
}

/**
 * Obtiene la lista de proveedores disponibles
 * @returns {string[]}
 */
export function getAvailableProviders() {
  return Object.keys(PROVIDERS);
}

// Re-exportar funciones de parsing desde utils
export { parseNaturalDate, parseNaturalTime, parseNaturalDateAndTime } from '../utils/dateTimeParser.js';
