# 🤖 Configuración de Gemini AI

## 📋 Pasos para habilitar IA en el bot

### 1. Obtener API Key de Gemini
1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Crea una nueva API key
4. Copia la clave generada

### 2. Configurar variables de entorno
Edita tu archivo `.env` y agrega tu API key:

```env
# Configuración de Gemini AI
GEMINI_API_KEY=tu_api_key_aqui
GEMINI_ENABLED=true
```

### 3. Reiniciar el bot
```bash
npm start
```

## 🎯 Funcionalidades habilitadas con IA

### ✅ Procesamiento de lenguaje natural
- **Fechas naturales**: "mañana", "el próximo miércoles", "pasado mañana"
- **Horas naturales**: "3 de la tarde", "10 de la mañana", "2:30 PM"
- **Agendamiento directo**: "quiero una cita con Mauricio mañana a las 3"

### ✅ Detección de intenciones
- **Agendar cita**: "quiero agendar", "necesito una cita"
- **Ver servicios**: "¿qué servicios tienen?", "muéstrame los precios"
- **Saludos**: "hola", "buenos días"

### ✅ Agendamiento inteligente
- **Información completa**: El bot puede procesar toda la información de una vez
- **Información parcial**: Completa paso a paso lo que falta
- **Validación automática**: Verifica disponibilidad y horarios

## 💰 Costos (Gratuito)

### Límites de Gemini Free:
- ✅ **15 requests por minuto**
- ✅ **1M tokens por día**
- ✅ **Sin costo monetario**

### Estimación para tu barbería:
- **~50 citas/día** = ~150 requests/día
- **Costo: $0** (dentro del límite gratuito)

## 🧪 Ejemplos de uso

### Saludo inteligente:
```
Usuario: "hola"
Bot: "¡Hola! 👋 Bienvenido a Cabelleros💈

🤖 Soy tu asistente y puedo ayudarte a agendar tu cita de forma rápida y fácil.

📋 NUESTROS SERVICIOS:
✂️ Corte sencillo - $20,000 COP (30 min)
🧔 Corte con barba - $25,000 COP (45 min)
🪒 Servicio sencillo - $12,000 COP (15 min)

👨‍💼 BARBEROS DISPONIBLES:
👨‍💼 Mauricio
👨‍💼 Stiven

⏰ HORARIO DE ATENCIÓN:
Lunes a Sábado: 08:00 AM - 19:30 PM

💡 Puedes decirme directamente:
• "Quiero un corte sencillo con Mauricio mañana a las 3"
• "Necesito una cita el viernes por la tarde"
• "¿Qué servicios tienen?"
• "Agendar con Stiven para el próximo miércoles"

¿En qué puedo ayudarte hoy?"
```

### Agendamiento directo:
```
Usuario: "quiero una cita con Mauricio mañana a las 3 de la tarde para un corte sencillo"
Bot: "🤖 ¡Perfecto! He entendido tu solicitud:
     👨‍💼 Barbero: 👨‍💼 Mauricio
     ✂️ Servicio: ✂️ Corte sencillo
     📅 Fecha: 18/12/2024
     🕐 Hora: 15:00
     
     Ahora necesito algunos datos tuyos:
     Por favor, escribe tu nombre completo:"
```

### Fechas naturales:
```
Usuario: "el próximo miércoles"
Bot: "✅ Fecha seleccionada: 18/12/2024"
```

### Horas naturales:
```
Usuario: "3 de la tarde"
Bot: "✅ Hora seleccionada: 15:00"
```

## 🔧 Deshabilitar IA

Si quieres usar solo el flujo tradicional, edita `.env`:

```env
GEMINI_ENABLED=false
```

## 🐛 Solución de problemas

### Error: "Gemini API key no configurada"
- Verifica que `GEMINI_API_KEY` esté en tu archivo `.env`
- Reinicia el bot después de agregar la clave

### Error: "No se pudo extraer JSON de la respuesta"
- La IA no entendió el mensaje, el bot usará el flujo tradicional
- Intenta ser más específico en tu mensaje

### Respuestas lentas
- Gemini puede tardar 1-3 segundos en responder
- Esto es normal para procesamiento de IA
