/**
 * Proveedor de IA para Google Gemini
 */

import { GoogleGenAI } from '@google/genai';
import BaseAIProvider from './BaseAIProvider.js';

export default class GeminiProvider extends BaseAIProvider {
  constructor() {
    super();
    this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  }

  /**
   * Nombre del proveedor
   */
  get name() {
    return 'Gemini';
  }

  /**
   * Inicializa el cliente de Gemini
   */
  initialize() {
    if (this.isInitialized) return this.client;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no está definida en las variables de entorno');
    }

    this.log('info', `🔑 API Key: ${apiKey.substring(0, 10)}...`);
    this.client = new GoogleGenAI({ apiKey });
    this.isInitialized = true;
    
    return this.client;
  }

  /**
   * Prueba la conexión con Gemini
   */
  async testConnection() {
    try {
      this.initialize();
      await this.client.models.generateContent({
        model: this.model,
        contents: 'Hola'
      });
      this.log('info', '✅ Conexión exitosa');
      return true;
    } catch (error) {
      this.log('error', `Error de conexión: ${error.message}`);
      return false;
    }
  }

  /**
   * Procesa un mensaje con Gemini y extrae información estructurada
   */
  async processNaturalLanguage(message, conversationState) {
    const apiKey = process.env.GEMINI_API_KEY;
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
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt
      });

      const aiResponse = this.extractJSON(response.text);
      
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
      if (error.message && error.message.includes('API key not valid')) {
        this.log('error', '🔑 Error de API key - Verifica que la clave sea correcta en .env');
        this.log('error', `🔑 API Key actual: ${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'NO CONFIGURADA'}`);
      }
      
      return null;
    }
  }
}
