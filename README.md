# WhatsApp Business Bot - Sistema de Reservas de Barbería

Un bot inteligente para WhatsApp Business que permite a los clientes agendar citas de barbería directamente desde WhatsApp y sincronizarlas con Google Calendar.

## 🚀 Características

- **Menú interactivo** con opciones claras para los clientes
- **Tres tipos de servicios**: Corte sencillo, Corte con barba, Solo barba
- **Recolección de datos** del cliente (nombre y teléfono)
- **Selección de fecha y hora** con validaciones
- **Sincronización automática** con Google Calendar
- **Confirmación de citas** con todos los detalles
- **Manejo de estados** de conversación para flujos complejos

## 📋 Servicios Disponibles

| Servicio | Duración | Precio | Emoji |
|----------|----------|--------|-------|
| Corte sencillo | 30 min | $15,000 COP | ✂️ |
| Corte con barba | 45 min | $25,000 COP | 🧔 |
| Solo barba | 15 min | $10,000 COP | 🪒 |

## 🛠️ Instalación

1. **Clona el repositorio**:
   ```bash
   git clone <tu-repositorio>
   cd whatsapp-bot
   ```

2. **Instala las dependencias**:
   ```bash
   npm install
   ```

3. **Configura Google Calendar API**:
   - Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - Crea un nuevo proyecto o selecciona uno existente
   - Habilita la API de Google Calendar
   - Crea credenciales OAuth 2.0
   - Descarga el archivo `credentials.json` y colócalo en la raíz del proyecto

4. **Ejecuta el bot**:
   ```bash
   npm start
   ```

## 📱 Flujo de Conversación

1. **Inicio**: El cliente escribe "hola" y recibe el menú principal
2. **Selección de servicio**: Elige entre las 3 opciones disponibles
3. **Datos del cliente**: Proporciona nombre completo y teléfono
4. **Fecha**: Selecciona la fecha deseada (formato DD/MM/AAAA)
5. **Hora**: Elige entre los horarios disponibles
6. **Confirmación**: Revisa todos los detalles y confirma la cita
7. **Calendario**: La cita se crea automáticamente en Google Calendar

## 🔧 Configuración

### Variables de Entorno
Crea un archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

Configura las siguientes variables:

```env
# Configuración del Bot de WhatsApp
PORT=3000

# Configuración de Google Calendar
GOOGLE_CALENDAR_ID={Nombre-calendario}
GOOGLE_TIMEZONE={TU ZONA HORARIA}

# Configuración de la Barbería
BUSINESS_NAME={NOMBRRE DEL PROYECTO}
BUSINESS_HOURS_OPEN=08:00 {EJEMPLOS}
BUSINESS_HOURS_CLOSE=19:30 {EJEMPLOS}
MIN_ADVANCE_HOURS=1 {EJEMPLOS}

# Configuración de WhatsApp
WHATSAPP_HEADLESS=true

# Configuración de Servicios (Precios en COP)
SERVICE_SIMPLE_CUT_PRICE={PRECIO}
SERVICE_CUT_WITH_BEARD_PRICE={PRECIO}
SERVICE_BEARD_ONLY_PRICE={PRECIO}

# Configuración de Duración (en minutos)
SERVICE_SIMPLE_CUT_DURATION={TIEMPO}
SERVICE_CUT_WITH_BEARD_DURATION={TIEMPO}
SERVICE_BEARD_ONLY_DURATION={TIEMPO}

# Configuración de Recordatorios (en minutos)
REMINDER_MINUTES={TIEMPO}
```

### Personalización de Servicios
Puedes personalizar todo desde el archivo `.env`:
- **Precios de los servicios**: `SERVICE_*_PRICE`
- **Duración de las citas**: `SERVICE_*_DURATION`
- **Horarios de atención**: `BUSINESS_HOURS_OPEN/CLOSE`
- **Nombre del negocio**: `BUSINESS_NAME`
- **Anticipación mínima**: `MIN_ADVANCE_HOURS`
- **Recordatorios**: `REMINDER_MINUTES`

## 📁 Estructura del Proyecto

```
whatsapp-bot/
├── index.js                 # Archivo principal del bot
├── services.js              # Configuración de servicios y precios
├── conversationManager.js   # Manejo de estados de conversación
├── googleCalendar.js        # Integración con Google Calendar
├── package.json             # Dependencias del proyecto
├── credentials.json         # Credenciales de Google (no incluido)
├── token.json              # Token de acceso (generado automáticamente)
└── auth_info/              # Archivos de autenticación de WhatsApp
```

## 🔐 Autenticación

### WhatsApp
- El bot genera un código QR que debes escanear con WhatsApp
- La autenticación se guarda automáticamente en la carpeta `auth_info/`

### Google Calendar
- Primera ejecución: Sigue las instrucciones en consola para autorizar
- El token se guarda en `token.json` para futuras ejecuciones

## 🚨 Notas Importantes

- **Horario de atención**: 08:00 AM - 7:30 PM
- **Zona horaria**: America/Bogota
- **Formato de fecha**: DD/MM/AAAA
- **Validaciones**: No se permiten fechas pasadas
- **Persistencia**: Los estados de conversación se mantienen en memoria

## 🐛 Solución de Problemas

### Error de Google Calendar
- Verifica que `credentials.json` esté en la raíz del proyecto
- Asegúrate de que la API de Google Calendar esté habilitada
- Revisa que el token no haya expirado

### Error de WhatsApp
- Elimina la carpeta `auth_info/` y reinicia el bot
- Escanea el nuevo código QR

### Error de puerto
- Cambia el puerto en `index.js` si el 3000 está ocupado

## 📞 Soporte

Para soporte técnico o preguntas sobre el bot, contacta al desarrollador.

---

**Desarrollado con ❤️ para Cabelleros 💈**
