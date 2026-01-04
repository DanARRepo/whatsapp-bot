# WhatsApp Business Bot - Sistema de Reservas de Barbería

Un bot inteligente para WhatsApp Business que permite a los clientes agendar, reagendar y cancelar citas de barbería directamente desde WhatsApp, con sincronización automática con Google Calendar y procesamiento de lenguaje natural mediante IA.

## 🚀 Características Principales

### Funcionalidades Core
- ✅ **Agendamiento de citas** con validaciones completas
- ✅ **Reagendamiento de citas** con mínimo 1 hora de anticipación
- ✅ **Cancelación de citas** con mínimo 1 hora de anticipación
- ✅ **Sincronización automática** con Google Calendar
- ✅ **Múltiples barberos** con calendarios independientes
- ✅ **Horarios flexibles**: General, Extra (precio doble) y horario de almuerzo

### Procesamiento Inteligente
- 🤖 **Arquitectura modular de IA** - Soporta múltiples proveedores (Gemini, Perplexity)
- 🗣️ **Procesamiento de lenguaje natural** - Entiende frases como "corte mañana a las 3 con Mauricio"
- 📅 **Fechas naturales** - "mañana", "próximo viernes", "pasado mañana"
- ⏰ **Horas naturales** - "3 de la tarde", "10 y media de la mañana"
- 🎯 **Agendamiento directo** - Todo en una sola frase

### Horarios y Precios
- 💈 **Horario General**: 9:30 AM - 8:00 PM (precio normal)
- 🌙 **Horario Extra**: 7:00 AM - 9:29 AM y 8:00 PM - 10:00 PM (precio doble)
- 🍽️ **Horario de Almuerzo**: 1:00 PM - 2:00 PM (no se agendan citas)

## 📋 Servicios Disponibles

| Servicio | Duración | Precio | Emoji |
|----------|----------|--------|-------|
| Corte de cabello | 30 min | $20,000 COP | ✂️ |
| Corte con barba | 45 min | $25,000 COP | 🧔 |
| Servicio sencillo | 15 min | $12,000 COP | 🪒 |

## 🏗️ Arquitectura del Proyecto

### Estructura Modular de IA

El proyecto utiliza una arquitectura modular que permite cambiar entre diferentes proveedores de IA sin modificar el código del bot:

```
whatsapp-bot/
├── aiProviders/              # Proveedores de IA modulares
│   ├── index.js             # Factory y exports principales
│   ├── BaseAIProvider.js    # Clase base abstracta
│   ├── GeminiProvider.js    # Implementación para Google Gemini
│   └── PerplexityProvider.js # Implementación para Perplexity
├── utils/                    # Utilidades compartidas
│   └── dateTimeParser.js    # Parsing de fechas/horas (independiente de IA)
├── index.js                  # Lógica principal del bot
├── services.js               # Configuración de servicios, barberos y horarios
├── conversationManager.js    # Manejo de estados de conversación
├── googleCalendar.js         # Integración con Google Calendar
└── package.json              # Dependencias del proyecto
```

### Proveedores de IA Soportados

#### 1. Google Gemini (Recomendado para desarrollo)
- **Modelo por defecto**: `gemini-2.0-flash`
- **Ventajas**: Generosa capa gratuita, excelente para desarrollo
- **Configuración**: `AI_PROVIDER=gemini`

#### 2. Perplexity
- **Modelos disponibles**:
  - `sonar` - Ligero y económico (recomendado)
  - `sonar-pro` - Avanzado para consultas complejas
  - `sonar-reasoning-pro` - Razonamiento con Chain of Thought
  - `sonar-deep-research` - Investigación exhaustiva
- **Ventajas**: Búsqueda web en tiempo real, respuestas actualizadas
- **Configuración**: `AI_PROVIDER=perplexity`
- **Nota**: Plan Pro incluye $5 USD mensuales de créditos para API

## 🛠️ Instalación

### 1. Clonar el Repositorio

```bash
git clone <tu-repositorio>
cd whatsapp-bot
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Google Calendar API

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **API de Google Calendar**
4. Crea credenciales **OAuth 2.0** (tipo "Aplicación de escritorio")
5. Descarga el archivo `credentials.json` y colócalo en la raíz del proyecto
6. En la primera ejecución, el bot te pedirá autorización y generará `token.json`

### 4. Configurar Variables de Entorno

Copia el archivo de ejemplo y configura tus valores:

```bash
cp env-example.txt .env
```

Edita el archivo `.env` con tus configuraciones (ver sección de Configuración).

### 5. Ejecutar el Bot

```bash
npm start
```

En la primera ejecución:
- **WhatsApp**: Escanea el código QR que aparece en la consola
- **Google Calendar**: Sigue las instrucciones para autorizar el acceso

## ⚙️ Configuración

### Variables de Entorno Principales

#### Proveedor de IA

```env
# Seleccionar proveedor: "gemini" | "perplexity"
AI_PROVIDER=gemini

# Google Gemini
GEMINI_ENABLED=true
GEMINI_API_KEY=tu_api_key_de_gemini
GEMINI_MODEL=gemini-2.0-flash

# Perplexity
PERPLEXITY_ENABLED=false
PERPLEXITY_API_KEY=tu_api_key_de_perplexity
PERPLEXITY_MODEL=sonar
```

#### Google Calendar

```env
GOOGLE_CALENDAR_ID=primary
GOOGLE_TIMEZONE=America/Bogota
REMINDER_MINUTES=30
```

#### Horarios del Negocio

```env
# Horario general (precio normal)
BUSINESS_HOURS_GENERAL_OPEN=09:30
BUSINESS_HOURS_GENERAL_CLOSE=20:00
BUSINESS_HOURS_GENERAL_LAST=19:30

# Horario extra (precio doble)
BUSINESS_HOURS_EXTRA_OPEN=07:00
BUSINESS_HOURS_EXTRA_CLOSE=22:00
BUSINESS_HOURS_EXTRA_LAST=21:30

# Horario de almuerzo (no citas)
BUSINESS_HOURS_BREAK_START=13:00
BUSINESS_HOURS_BREAK_END=14:00
```

#### Información del Negocio

```env
BUSINESS_NAME=Caballeros
PORT=3000
```

### Personalización de Servicios y Barberos

Los servicios y barberos se configuran directamente en `services.js`:

```javascript
export const SERVICES = {
  SIMPLE_CUT: {
    id: 1,
    name: "Corte de cabello",
    price: 20000,
    duration: 30,
    emoji: "✂️"
  },
  // ...
};

export const BARBERS = {
  BARBER_1: {
    id: 1,
    name: "Mauricio",
    calendarId: "Citas - Mauricio",
    emoji: "👨‍💼"
  },
  // ...
};
```

## 📱 Flujo de Conversación

### Agendamiento de Cita

1. **Inicio**: Cliente escribe "hola" → Recibe saludo con información del negocio
2. **Selección de servicio y barbero**: Puede especificar ambos en una frase
3. **Fecha y hora**: Puede especificar ambas en lenguaje natural
4. **Datos del cliente**: Nombre completo y teléfono
5. **Confirmación**: Revisa todos los detalles y confirma
6. **Calendario**: La cita se crea automáticamente en Google Calendar

**Ejemplo de agendamiento rápido:**
```
Usuario: "Quiero un corte de cabello mañana a las 3 de la tarde con Mauricio"
Bot: [Extrae toda la información y solo pide nombre y teléfono]
```

### Reagendamiento de Cita

1. Cliente dice: "reagendar cita", "cambiar cita", "modificar horario"
2. Bot busca citas del cliente (por nombre o teléfono)
3. Cliente selecciona la cita a reagendar
4. Cliente proporciona nueva fecha/hora
5. Bot valida mínimo 1 hora de anticipación
6. Bot elimina cita anterior y crea nueva

### Cancelación de Cita

1. Cliente dice: "cancelar cita", "eliminar cita"
2. Bot busca citas del cliente
3. Cliente selecciona la cita a cancelar
4. Bot valida mínimo 1 hora de anticipación
5. Bot elimina la cita del calendario

## 🔄 Cambiar entre Proveedores de IA

### De Gemini a Perplexity

1. Edita tu `.env`:
```env
AI_PROVIDER=perplexity
PERPLEXITY_ENABLED=true
PERPLEXITY_API_KEY=tu_api_key
PERPLEXITY_MODEL=sonar
```

2. Reinicia el bot:
```bash
npm start
```

### De Perplexity a Gemini

1. Edita tu `.env`:
```env
AI_PROVIDER=gemini
GEMINI_ENABLED=true
GEMINI_API_KEY=tu_api_key
```

2. Reinicia el bot

**Nota**: No necesitas modificar código, solo cambiar variables de entorno.

## 🧪 Pruebas

### Probar Conexión con Perplexity

```bash
node -e "import('./aiProviders/index.js').then(async m => { const provider = m.getAIProvider(); console.log('Proveedor:', provider.name); const result = await m.testAIConnection(); console.log('Conexión:', result ? '✅ OK' : '❌ Error'); })"
```

### Probar Parsing de Fechas

```bash
node -e "import('./utils/dateTimeParser.js').then(m => { console.log('Mañana:', m.parseNaturalDate('mañana')); console.log('3 PM:', m.parseNaturalTime('3 de la tarde')); })"
```

## 🐛 Solución de Problemas

### Error: "Token expirado" (Google Calendar)

El token de Google Calendar puede expirar. Solución:

1. Elimina el archivo `token.json`
2. Reinicia el bot
3. Sigue las instrucciones para re-autorizar

El bot ahora detecta automáticamente tokens expirados y te guía para re-autorizar.

### Error: "API key not valid" (IA)

1. Verifica que la API key esté correcta en `.env`
2. Para Gemini: Verifica en [Google AI Studio](https://makersuite.google.com/app/apikey)
3. Para Perplexity: Verifica en [Perplexity API Portal](https://docs.perplexity.ai/getting-started/api-groups)

### Error: "No se pudo extraer JSON"

- La IA puede fallar ocasionalmente al parsear respuestas
- El bot automáticamente usa el flujo tradicional (menús) como fallback
- Verifica los logs para ver el error específico

### WhatsApp no conecta

1. Elimina la carpeta `auth_info/`
2. Reinicia el bot
3. Escanea el nuevo código QR

## 📊 Monitoreo de Uso

### Perplexity API

Si usas Perplexity, monitorea tu consumo:

1. Ve al [Portal de API de Perplexity](https://docs.perplexity.ai/getting-started/api-groups)
2. Revisa tu uso mensual
3. Plan Pro incluye $5 USD mensuales de créditos

**Estimación de costos con `sonar`**:
- ~$0.006 por consulta
- Con $5 USD: ~833 consultas/mes

### Google Calendar

- Las citas se crean automáticamente
- Los recordatorios se configuran según `REMINDER_MINUTES`
- Cada barbero tiene su propio calendario

## 🔐 Seguridad

### Archivos Sensibles (NO subir a Git)

Asegúrate de que `.gitignore` incluya:

```
.env
credentials.json
token.json
auth_info/
*.log
node_modules/
```

### Variables de Entorno

- **Nunca** compartas tu `.env` con información sensible
- **Nunca** subas `credentials.json` o `token.json` a repositorios públicos
- Rota tus API keys periódicamente

## 📚 Documentación Adicional

- [Documentación de Perplexity API](https://docs.perplexity.ai/)
- [Google Calendar API](https://developers.google.com/calendar)
- [WhatsApp Web.js](https://wwebjs.dev/)

## 🚀 Próximas Mejoras

- [ ] Soporte para múltiples idiomas
- [ ] Integración con sistemas de pago
- [ ] Dashboard de administración
- [ ] Notificaciones push
- [ ] Historial de citas del cliente

## 📞 Soporte

Para soporte técnico o preguntas sobre el bot, contacta al desarrollador.

---

**Desarrollado con ❤️ para Cabelleros 💈**

*Última actualización: Enero 2025*
