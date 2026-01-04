/**
 * Proveedor de IA para Perplexity
 * Perplexity usa una API compatible con OpenAI
 * 
 * Modelos disponibles (2025):
 * - sonar: Ligero y económico, bueno para consultas simples
 * - sonar-pro: Avanzado, soporta consultas complejas y seguimiento
 * - sonar-reasoning-pro: Razonamiento preciso con Chain of Thought (CoT)
 * - sonar-deep-research: Investigación exhaustiva y reportes comprehensivos
 * 
 * @see https://docs.perplexity.ai/getting-started/models
 */

import BaseAIProvider from './BaseAIProvider.js';

// Modelos disponibles en Perplexity (actualizados 2025)
export const PERPLEXITY_MODELS = {
  // Search models
  SONAR: 'sonar',
  SONAR_PRO: 'sonar-pro',
  // Reasoning models
  SONAR_REASONING_PRO: 'sonar-reasoning-pro',
  // Research models
  SONAR_DEEP_RESEARCH: 'sonar-deep-research'
};

export default class PerplexityProvider extends BaseAIProvider {
  constructor() {
    super();
    // Usar sonar por defecto (ligero y económico)
    this.model = process.env.PERPLEXITY_MODEL || PERPLEXITY_MODELS.SONAR;
    this.baseUrl = 'https://api.perplexity.ai';
  }

  /**
   * Nombre del proveedor
   */
  get name() {
    return 'Perplexity';
  }

  /**
   * Inicializa el cliente de Perplexity
   */
  initialize() {
    if (this.isInitialized) return;

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY no está definida en las variables de entorno');
    }

    this.log('info', `🔑 API Key: ${apiKey.substring(0, 10)}...`);
    this.apiKey = apiKey;
    this.isInitialized = true;
  }

  /**
   * Prueba la conexión con Perplexity
   */
  async testConnection() {
    try {
      this.initialize();
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'Hola' }],
          max_tokens: 10
        })
      });

      if (response.ok) {
        this.log('info', '✅ Conexión exitosa');
        return true;
      } else {
        const error = await response.json();
        this.log('error', `Error de conexión: ${JSON.stringify(error)}`);
        return false;
      }
    } catch (error) {
      this.log('error', `Error de conexión: ${error.message}`);
      return false;
    }
  }

  /**
   * Procesa un mensaje con Perplexity y extrae información estructurada
   */
  async processNaturalLanguage(message, conversationState) {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      this.log('warn', 'API key no configurada, usando flujo tradicional');
      return null;
    }

    try {
      this.initialize();
      
      this.log('info', `Usando modelo: ${this.model}`);
      this.log('info', `📝 Mensaje: "${message}"`);
      this.log('info', `🔍 Estado: ${JSON.stringify(conversationState)}`);

      const prompt = this.generatePrompt(message, conversationState);
      
      this.log('info', 'Procesando...');
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'Eres un asistente de una barbería. Responde SOLO en formato JSON válido.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.2,
          top_p: 0.9
        })
      });

      if (!response.ok) {
        const error = await response.json();
        this.log('error', `Error de API: ${JSON.stringify(error)}`);
        return null;
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || '';
      
      const aiResponse = this.extractJSON(responseText);
      
      if (aiResponse) {
        this.log('info', `✅ Respuesta: ${JSON.stringify(aiResponse)}`);
        return aiResponse;
      } else {
        this.log('error', 'No se pudo extraer JSON de la respuesta');
        return null;
      }
    } catch (error) {
      this.log('error', `Error procesando: ${error.message}`);
      
      // Log específico para errores de API key
      if (error.message && error.message.includes('401')) {
        this.log('error', '🔑 Error de API key - Verifica que la clave sea correcta en .env');
      }
      
      return null;
    }
  }
}
