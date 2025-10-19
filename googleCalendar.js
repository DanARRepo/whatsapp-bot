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
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  } else {
    return getAccessToken(oAuth2Client);
  }
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
    
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching existing appointments:', error);
    return [];
  }
}
