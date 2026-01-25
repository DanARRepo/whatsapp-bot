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
- ✅ **Servidor web integrado** para acceso al QR y monitoreo
- ✅ **Soporte para Cloudflare Tunnel** para acceso remoto seguro

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

### Estructura de Directorios

```
whatsapp-bot/
├── src/
│   ├── aiProviders/              # Proveedores de IA modulares
│   │   ├── index.js             # Factory y exports principales
│   │   ├── BaseAIProvider.js    # Clase base abstracta
│   │   ├── GeminiProvider.js    # Implementación para Google Gemini
│   │   └── PerplexityProvider.js # Implementación para Perplexity
│   ├── config/                   # Configuración del sistema
│   │   ├── business.js          # Configuración del negocio
│   │   ├── constants.js         # Constantes de la aplicación
│   │   ├── env.js               # Validación de variables de entorno
│   │   └── messages.js          # Mensajes del bot
│   ├── core/                     # Componentes principales
│   │   ├── server.js            # Servidor Express (QR, health checks)
│   │   └── whatsapp.js          # Cliente de WhatsApp Web.js
│   ├── data/                     # Datos y gestión de estado
│   │   ├── barbers.js           # Configuración de barberos
│   │   ├── conversationManager.js # Gestión de estados de conversación
│   │   └── services.js          # Configuración de servicios
│   ├── flows/                    # Flujos de conversación
│   │   ├── bookingFlow.js       # Flujo de agendamiento
│   │   ├── cancelFlow.js        # Flujo de cancelación
│   │   ├── mainMenu.js          # Menú principal
│   │   ├── rescheduleFlow.js    # Flujo de reagendamiento
│   │   └── router.js            # Enrutador de mensajes
│   ├── services/                 # Servicios externos
│   │   ├── bookingService.js    # Lógica de negocio para citas
│   │   └── googleCalendar.js    # Integración con Google Calendar
│   ├── utils/                    # Utilidades compartidas
│   │   └── dateTimeParser.js    # Parsing de fechas/horas (independiente de IA)
│   └── app.js                    # Punto de entrada principal
├── .env.example                  # Ejemplo de variables de entorno
├── flake.nix                    # Configuración Nix para desarrollo
├── package.json                  # Dependencias del proyecto
└── README.md                     # Este archivo
```

### Proveedores de IA Soportados

#### 1. Google Gemini (Recomendado para desarrollo)
- **Modelo por defecto**: `gemini-2.0-flash`
- **Ventajas**: Generosa capa gratuita, excelente para desarrollo
- **Configuración**: `AI_PROVIDER=gemini`
- **Documentación**: Ver `GEMINI_SETUP.md` para detalles de configuración

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

### Requisitos Previos

- **Node.js**: v20 o superior
- **npm**: v9 o superior
- **Chromium**: Para ejecutar WhatsApp Web.js (se descarga automáticamente o se usa el del sistema)
- **Google Cloud Project**: Con Google Calendar API habilitada
- **Cuenta de WhatsApp Business**: Para conectar el bot

### 1. Clonar el Repositorio

```bash
git clone <tu-repositorio>
cd whatsapp-bot
```

### 2. Instalar Dependencias

```bash
npm install --legacy-peer-deps
```

**Nota**: Se usa `--legacy-peer-deps` debido a incompatibilidades menores entre dependencias.

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
cp .env.example .env
```

Edita el archivo `.env` con tus configuraciones (ver sección de Configuración).

### 5. Ejecutar el Bot

#### Desarrollo Local

```bash
npm start
```

#### Con Nix (si tienes Nix instalado)

```bash
nix run .
```

En la primera ejecución:
- **WhatsApp**: Escanea el código QR que aparece en la consola o accede a `http://localhost:3000/qr`
- **Google Calendar**: Sigue las instrucciones para autorizar el acceso

## 🌐 Servidor Web y Endpoints

El bot incluye un servidor Express que proporciona varios endpoints útiles:

### Endpoints Disponibles

| Endpoint | Descripción | Tipo |
|----------|-------------|------|
| `/` | Información del API y lista de endpoints | JSON |
| `/health` | Health check del servicio | JSON |
| `/qr` | Página HTML con código QR para WhatsApp | HTML |
| `/qr/qr.html` | Archivo HTML del QR | HTML |
| `/qr/qr.png` | Imagen PNG del código QR | PNG |
| `/api/qr` | Endpoint API para obtener QR como imagen | PNG |
| `/api/tunnel-url` | URL del túnel de Cloudflare (si está configurado) | JSON |

### Ejemplos de Uso

```bash
# Health check
curl http://localhost:3000/health

# Obtener QR como imagen
curl http://localhost:3000/api/qr -o qr.png

# Obtener información del túnel
curl http://localhost:3000/api/tunnel-url
```

### Acceso desde la Red Local

El servidor escucha en todas las interfaces (`0.0.0.0`), por lo que puedes acceder desde otros dispositivos en tu red local:

```
http://<IP_LOCAL>:3000/qr
```

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

#### Configuración de WhatsApp

```env
WHATSAPP_HEADLESS=true
```

#### Servicios (Precios en COP)

```env
SERVICE_SIMPLE_CUT_PRICE=20000
SERVICE_CUT_WITH_BEARD_PRICE=25000
SERVICE_SIMPLE_SERVICE_PRICE=12000
```

#### Duración de Servicios (en minutos)

```env
SERVICE_SIMPLE_CUT_DURATION=30
SERVICE_CUT_WITH_BEARD_DURATION=45
SERVICE_SIMPLE_SERVICE_DURATION=15
```

#### Barberos

```env
BARBER_1_NAME=Mauricio
BARBER_1_CALENDAR_ID=Citas - Mauricio
BARBER_2_NAME=Stiven
BARBER_2_CALENDAR_ID=Citas - Stiven
```

### Personalización de Servicios y Barberos

Los servicios y barberos se configuran en los archivos correspondientes:

- **Servicios**: `src/data/services.js`
- **Barberos**: `src/data/barbers.js`

También puedes usar variables de entorno para personalizar nombres, precios y duraciones.

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

## 🚀 Despliegue en Producción

### Despliegue en NixOS

El proyecto incluye un `flake.nix` que define todas las dependencias necesarias para ejecutar el bot en NixOS, incluyendo Chromium y todas sus dependencias del sistema.

**Nota**: Para un despliegue completo en NixOS con systemd, consulta la documentación de NixOS sobre servicios systemd.

### Despliegue con PM2

```bash
# Instalar PM2
npm install -g pm2

# Iniciar el bot
pm2 start src/app.js --name whatsapp-bot

# Configurar inicio automático
pm2 startup
pm2 save
```

### Despliegue con Docker

```dockerfile
FROM node:20-slim

# Instalar dependencias de Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

CMD ["npm", "start"]
```

## 🧪 Pruebas

### Probar Conexión con IA

```bash
node -e "import('./src/aiProviders/index.js').then(async m => { const provider = m.getAIProvider(); console.log('Proveedor:', provider.name); const result = await m.testAIConnection(); console.log('Conexión:', result ? '✅ OK' : '❌ Error'); })"
```

### Probar Parsing de Fechas

```bash
node -e "import('./src/utils/dateTimeParser.js').then(m => { console.log('Mañana:', m.parseNaturalDate('mañana')); console.log('3 PM:', m.parseNaturalTime('3 de la tarde')); })"
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

1. Elimina la carpeta `.wwebjs_auth/`
2. Reinicia el bot
3. Escanea el nuevo código QR

**Nota**: Eliminar `.wwebjs_auth/` requiere re-autenticación. Los archivos `SingletonLock` son solo archivos de bloqueo temporales y pueden eliminarse sin perder la sesión.

### Error: "LocalAuth is not compatible with a user-supplied userDataDir"

Este error ocurre si intentas configurar un `userDataDir` personalizado con `LocalAuth`. `LocalAuth` gestiona su propio directorio de sesión automáticamente. No configures `userDataDir` en las opciones de Puppeteer cuando uses `LocalAuth`.

### Problemas con Chromium en NixOS

Si estás desplegando en NixOS y Chromium no inicia correctamente:

1. Asegúrate de que todas las dependencias de Chromium estén instaladas (ver `flake.nix`)
2. Configura las variables de entorno:
   ```env
   PUPPETEER_EXECUTABLE_PATH=/run/current-system/sw/bin/chromium
   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
   ```
3. Verifica que el usuario tenga permisos para ejecutar Chromium

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
.wwebjs_auth/
*.log
node_modules/
qr/
tunnel-url.txt
```

### Variables de Entorno

- **Nunca** compartas tu `.env` con información sensible
- **Nunca** subas `credentials.json` o `token.json` a repositorios públicos
- Rota tus API keys periódicamente
- Usa diferentes credenciales para desarrollo y producción

### Mejores Prácticas

- Ejecuta el bot con un usuario sin privilegios de administrador
- Limita el acceso a los endpoints del servidor web
- Usa HTTPS cuando sea posible (por ejemplo, con Cloudflare Tunnel)
- Monitorea los logs regularmente para detectar actividad sospechosa

## 📚 Documentación Adicional

- [Documentación de Perplexity API](https://docs.perplexity.ai/)
- [Google Calendar API](https://developers.google.com/calendar)
- [WhatsApp Web.js](https://wwebjs.dev/)
- [Google Gemini API](https://ai.google.dev/docs)

## 🚀 Próximas Mejoras

- [ ] Soporte para múltiples idiomas
- [ ] Integración con sistemas de pago
- [ ] Dashboard de administración
- [ ] Notificaciones push
- [ ] Historial de citas del cliente
- [ ] Estadísticas y reportes
- [ ] Integración con más proveedores de IA

## 📞 Soporte

Para soporte técnico o preguntas sobre el bot, contacta al desarrollador o abre un issue en el repositorio.

---

**Desarrollado con ❤️ para Cabelleros 💈**

*Última actualización: Enero 2025*
