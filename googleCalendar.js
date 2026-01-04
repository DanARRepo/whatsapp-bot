import fs from "fs";
import readline from "readline";
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const TOKEN_PATH = "token.json";
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";
const TIMEZONE = process.env.GOOGLE_TIMEZONE || "America/Bogota";

export async function authorizeGoogle() {
  const credentials = JSON.parse(fs.readFileSync("credentials.json"));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
      oAuth2Client.setCredentials(token);
      
      // Verificar si el token es válido intentando refrescarlo
      if (token.refresh_token) {
        // El token existe, lo configuraremos y si expiró, se refrescará automáticamente en la siguiente petición
        return oAuth2Client;
      } else {
        // No hay refresh token, necesitamos re-autorizar
        console.log("⚠️ No hay refresh token. Necesitamos re-autorizar.");
        return getAccessToken(oAuth2Client);
      }
    } catch (error) {
      console.error("❌ Error al cargar token:", error.message);
      // Si hay error, eliminar el token corrupto y re-autorizar
      if (fs.existsSync(TOKEN_PATH)) {
        fs.unlinkSync(TOKEN_PATH);
        console.log("🗑️ Token corrupto eliminado. Se solicitará nueva autorización.");
      }
      return getAccessToken(oAuth2Client);
    }
  } else {
    return getAccessToken(oAuth2Client);
  }
}

// Función auxiliar para manejar errores de autenticación y re-autorizar si es necesario
export async function handleAuthError(error, oAuth2Client) {
  if (error.code === 400 && error.response?.data?.error === 'invalid_grant') {
    console.error("❌ Token expirado o revocado. Se requiere re-autorización.");
    
    // Eliminar token expirado
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
      console.log("🗑️ Token expirado eliminado.");
    }
    
    // Solicitar nueva autorización
    console.log("🔄 Por favor, re-autoriza la aplicación ejecutando el bot nuevamente.");
    console.log("📝 Deberás autenticarte nuevamente cuando el bot se reinicie.");
    
    throw new Error("Token expirado. Por favor, reinicia el bot para re-autorizar.");
  }
  
  throw error;
}

function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Autoriza esta URL:", authUrl);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question("Introduce el código de autorización: ", async (code) => {
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
      rl.close();
      resolve(oAuth2Client);
    });
  });
}

export async function createEvent(auth, { summary, description, startTime, endTime, barberCalendarId = null }) {
  const calendar = google.calendar({ version: "v3", auth });
  
  let calendarId;
  
  if (barberCalendarId) {
    // Si se especifica un calendario de barbero, usarlo directamente
    const calendarList = await calendar.calendarList.list();
    const targetCalendar = calendarList.data.items.find(cal => 
      cal.summary === barberCalendarId
    );
    calendarId = targetCalendar ? targetCalendar.id : "primary";
  } else {
    // Usar el calendario por defecto
    const calendarList = await calendar.calendarList.list();
    const targetCalendar = calendarList.data.items.find(cal => 
      cal.summary === CALENDAR_ID
    );
    calendarId = targetCalendar ? targetCalendar.id : "primary";
  }
  
  const event = {
    summary,
    description: description || "",
    start: { dateTime: startTime, timeZone: TIMEZONE },
    end: { dateTime: endTime, timeZone: TIMEZONE },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: parseInt(process.env.REMINDER_MINUTES) || 30 }
      ]
    }
  };

  const res = await calendar.events.insert({
    calendarId: calendarId,
    resource: event,
  });

  return res.data.htmlLink;
}

// Función para obtener citas existentes de un día específico
export async function getExistingAppointments(auth, date, barberCalendarId = null) {
  const calendar = google.calendar({ version: "v3", auth });
  
  let calendarId;
  
  if (barberCalendarId) {
    // Si se especifica un calendario de barbero, usarlo directamente
    const calendarList = await calendar.calendarList.list();
    const targetCalendar = calendarList.data.items.find(cal => 
      cal.summary === barberCalendarId
    );
    calendarId = targetCalendar ? targetCalendar.id : "primary";
  } else {
    // Usar el calendario por defecto
    const calendarList = await calendar.calendarList.list();
    const targetCalendar = calendarList.data.items.find(cal => 
      cal.summary === CALENDAR_ID
    );
    calendarId = targetCalendar ? targetCalendar.id : "primary";
  }
  
  // Crear rango de tiempo para el día completo
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  try {
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    // Mapear los eventos a nuestro formato
    const appointments = (response.data.items || []).map(event => ({
      startTime: event.start?.dateTime || event.start?.date || '',
      endTime: event.end?.dateTime || event.end?.date || '',
      summary: event.summary || '',
      description: event.description || ''
    }));
    
    return appointments;
  } catch (error) {
    console.error('❌ Error fetching existing appointments:', error.message);
    
    // Manejar error de autenticación
    if (error.code === 400 && error.response?.data?.error === 'invalid_grant') {
      console.error('🔐 Token expirado. Se requiere re-autorización.');
      // Eliminar token expirado
      if (fs.existsSync(TOKEN_PATH)) {
        fs.unlinkSync(TOKEN_PATH);
        console.log('🗑️ Token expirado eliminado. Reinicia el bot para re-autorizar.');
      }
      throw new Error('Token de Google Calendar expirado. Por favor, reinicia el bot para re-autorizar.');
    }
    
    return [];
  }
}

// Función para buscar citas por nombre o teléfono
export async function findAppointmentsByClient(auth, clientName, clientPhone) {
  const calendar = google.calendar({ version: "v3", auth });
  
  try {
    console.log(`🔍 Buscando citas para: nombre="${clientName}", teléfono="${clientPhone}"`);
    
    // Buscar en los próximos 30 días
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    // Obtener lista de calendarios
    const calendarList = await calendar.calendarList.list();
    const barberCalendars = calendarList.data.items.filter(cal => 
      cal.summary && cal.summary.includes('Citas')
    );
    
    console.log(`📅 Calendarios de barberos encontrados:`, barberCalendars.map(cal => cal.summary));
    
    const matchingAppointments = [];
    
    // Buscar en cada calendario de barbero
    for (const barberCalendar of barberCalendars) {
      console.log(`🔍 Buscando en calendario: ${barberCalendar.summary}`);
      
      const response = await calendar.events.list({
        calendarId: barberCalendar.id,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      const events = response.data.items || [];
      console.log(`📅 Eventos encontrados en ${barberCalendar.summary}: ${events.length}`);
      
      for (const event of events) {
        const description = event.description || '';
        const summary = event.summary || '';
        
        console.log(`🔍 Revisando evento: "${summary}" - Descripción: "${description}"`);
        
        // Buscar por nombre o teléfono en la descripción y resumen
        const nameMatch = clientName && (
          description.toLowerCase().includes(clientName.toLowerCase()) ||
          summary.toLowerCase().includes(clientName.toLowerCase())
        );
        
        const phoneMatch = clientPhone && (
          description.includes(clientPhone) ||
          summary.includes(clientPhone)
        );
        
        console.log(`🔍 nameMatch: ${nameMatch}, phoneMatch: ${phoneMatch}`);
        
        if (nameMatch || phoneMatch) {
          console.log(`✅ Cita encontrada: ${summary}`);
          matchingAppointments.push({
            id: event.id,
            summary: event.summary,
            description: event.description,
            start: event.start,
            end: event.end,
            calendarId: barberCalendar.id,
            calendarName: barberCalendar.summary
          });
        }
      }
    }
    
    console.log(`📅 Total de citas encontradas: ${matchingAppointments.length}`);
    return matchingAppointments;
  } catch (error) {
    console.error('Error buscando citas por cliente:', error);
    return [];
  }
}

// Función para eliminar una cita
export async function deleteAppointment(auth, eventId, calendarId = CALENDAR_ID) {
  const calendar = google.calendar({ version: "v3", auth });
  
  try {
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId
    });
    return true;
  } catch (error) {
    console.error('Error eliminando cita:', error);
    return false;
  }
}
