import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import express from "express";
import dotenv from "dotenv";
import { authorizeGoogle, createEvent, getExistingAppointments } from "./googleCalendar.js";
import {
    SERVICES,
    BARBERS,
    CONVERSATION_STATES,
    getMainMenu,
    getBarberMenu,
    getServiceMenu,
    getServicesAndPrices,
    getServiceById,
    getBarberById,
    isWithinBusinessHours,
    getAvailableTimeSlots
} from "./services.js";
import ConversationManager from "./conversationManager.js";

// Cargar variables de entorno
dotenv.config();

const app = express();
let calendarAuth;
const conversationManager = new ConversationManager();

// Crear cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: process.env.WHATSAPP_HEADLESS === 'true',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Evento cuando se genera el QR
client.on('qr', (qr) => {
    console.log("\n" + "=".repeat(50));
    console.log("📱 ESCANEA ESTE QR CON WHATSAPP:");
    console.log("=".repeat(50));
    qrcode.generate(qr, { small: true });
    console.log("=".repeat(50));
    console.log("1. Abre WhatsApp en tu teléfono");
    console.log("2. Ve a Configuración > Dispositivos vinculados");
    console.log("3. Toca 'Vincular un dispositivo'");
    console.log("4. Escanea el QR de arriba");
    console.log("=".repeat(50) + "\n");
});

// Evento cuando se conecta exitosamente
client.on('ready', () => {
    console.log("✅ ¡Conectado a WhatsApp exitosamente!");
    console.log("🤖 El bot está listo para recibir mensajes");
});

// Evento cuando se desconecta
client.on('disconnected', (reason) => {
    console.log("❌ Cliente desconectado:", reason);
});

// Manejar mensajes
client.on('message', async (message) => {
    try {
        // Ignorar mensajes del bot
        if (message.fromMe) return;

        const text = message.body?.toLowerCase() || "";
        const from = message.from;
        const phoneNumber = from.replace("@c.us", "");

        console.log(`📨 Mensaje recibido de ${phoneNumber}: "${text}"`);

        await handleMessage(message, phoneNumber, text);
    } catch (error) {
        console.error("Error handling message:", error);
        await message.reply("❌ Lo siento, ocurrió un error. Por favor, intenta de nuevo.");
    }
});

// Función principal para manejar mensajes
async function handleMessage(message, phoneNumber, text) {
    const conversationState = conversationManager.getConversationState(phoneNumber);

    console.log(`🔍 Estado actual: ${conversationState.state}`);
    console.log(`📝 Texto recibido: "${text}"`);

    // Detectar saludos y reiniciar conversación
    const greetings = [
        "hola", "buenos días", "buenas tardes", "buenas noches",
        "buenas", "hey", "hi", "hello", "saludos", "inicio", "menu",
        "empezar", "comenzar", "nuevo", "otra vez", "de nuevo"
    ];

    const isGreeting = greetings.some(greeting => text.includes(greeting));

    // Si es un saludo, reiniciar conversación
    if (isGreeting) {
        console.log("🔄 Saludo detectado, reiniciando conversación");
        conversationManager.clearConversationState(phoneNumber);
        await showMainMenu(message, phoneNumber, text);
        return;
    }

    // Manejar según el estado actual de la conversación
    switch (conversationState.state) {
        case CONVERSATION_STATES.MENU:
            console.log("🔄 Procesando selección de menú");
            await handleMenuSelection(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.SELECTING_BARBER:
            console.log("🔄 Procesando selección de barbero");
            await handleBarberSelection(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.COLLECTING_NAME:
            console.log("🔄 Procesando entrada de nombre");
            await handleNameInput(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.COLLECTING_PHONE:
            console.log("🔄 Procesando entrada de teléfono");
            await handlePhoneInput(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.SELECTING_DATE:
            console.log("🔄 Procesando selección de fecha");
            await handleDateSelection(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.SELECTING_TIME:
            console.log("🔄 Procesando selección de hora");
            await handleTimeSelection(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.CONFIRMING:
            console.log("🔄 Procesando confirmación");
            await handleConfirmation(message, phoneNumber, text);
            break;
        default:
            console.log("🔄 Estado desconocido, mostrando menú");
            await showMainMenu(message, phoneNumber, text);
    }
}

// Mostrar menú principal
async function showMainMenu(message, phoneNumber, text) {
    conversationManager.updateConversationState(phoneNumber, { state: CONVERSATION_STATES.MENU });

    // Detectar si es un saludo para personalizar la respuesta
    const greetings = [
        "hola", "buenos días", "buenas tardes", "buenas noches",
        "buenas", "hey", "hi", "hello", "saludos", "inicio", "menu",
        "empezar", "comenzar", "nuevo", "otra vez", "de nuevo"
    ];

    const isGreeting = greetings.some(greeting => text.toLowerCase().includes(greeting));

    if (isGreeting) {
        await message.reply(getMainMenu());
    }
}

// Manejar selección del menú
async function handleMenuSelection(message, phoneNumber, text) {
    const option = text.trim();

    if (option === "1") {
        // Agendar cita - mostrar menú de barberos
        conversationManager.updateConversationState(phoneNumber, {
            state: CONVERSATION_STATES.SELECTING_BARBER
        });
        await message.reply(getBarberMenu());
    } else if (option === "2") {
        // Mostrar servicios y precios
        await message.reply(getServicesAndPrices());
    } else {
        await message.reply("❌ Opción no válida. Por favor, responde con 1 o 2.\n\n💡 Si quieres empezar de nuevo, escribe 'hola' o 'menu'.");
    }
}

// Manejar selección de barbero
async function handleBarberSelection(message, phoneNumber, text) {
    const option = text.trim();

    if (option === "1") {
        // Seleccionar Mauricio
        const barber = BARBERS.BARBER_1;
        conversationManager.updateConversationState(phoneNumber, {
            state: CONVERSATION_STATES.COLLECTING_NAME,
            selectedBarber: barber
        });
        await message.reply(`👨‍💼 Perfecto! Has seleccionado a ${barber.name}\n\nAhora selecciona el servicio que deseas:\n\n${getServiceMenu()}`);
    } else if (option === "2") {
        // Seleccionar Stiven
        const barber = BARBERS.BARBER_2;
        conversationManager.updateConversationState(phoneNumber, {
            state: CONVERSATION_STATES.COLLECTING_NAME,
            selectedBarber: barber
        });
        await message.reply(`👨‍💼 Perfecto! Has seleccionado a ${barber.name}\n\nAhora selecciona el servicio que deseas:\n\n${getServiceMenu()}`);
    } else {
        await message.reply("❌ Opción no válida. Por favor, responde con 1 o 2.\n\n💡 Si quieres empezar de nuevo, escribe 'hola' o 'menu'.");
    }
}

// Manejar entrada del nombre
async function handleNameInput(message, phoneNumber, text) {
    const name = text.trim();
    const conversationState = conversationManager.getConversationState(phoneNumber);
    
    console.log(`🔍 handleNameInput - Estado: ${conversationState.state}, Texto: "${text}"`);
    
    // Verificar si es una selección de servicio (solo si venimos de selección de barbero)
    if (conversationState.state === CONVERSATION_STATES.COLLECTING_NAME && 
        (text === "1" || text === "2" || text === "3")) {
        const serviceId = parseInt(text);
        let service;
        
        switch(serviceId) {
            case 1:
                service = SERVICES.SIMPLE_CUT;
                break;
            case 2:
                service = SERVICES.CUT_WITH_BEARD;
                break;
            case 3:
                service = SERVICES.SIMPLE_SERVICE;
                break;
        }
        
        if (service) {
            conversationManager.updateConversationState(phoneNumber, {
                selectedService: service
            });
            await message.reply(`✂️ Perfecto! Has seleccionado: ${service.emoji} ${service.name}\n💰 Precio: $${service.price.toLocaleString()} COP\n⏱️ Duración: ${service.duration} minutos\n\nPor favor, escribe tu nombre completo:`);
            return;
        }
    }
    
    if (name.length < 2) {
        await message.reply("❌ Por favor, escribe tu nombre completo (mínimo 2 caracteres):");
        return;
    }

    console.log(`✅ Guardando nombre: "${name}" para ${phoneNumber}`);
    conversationManager.updateConversationState(phoneNumber, {
        state: CONVERSATION_STATES.COLLECTING_PHONE,
        clientName: name
    });

    await message.reply(`✅ Nombre registrado: ${name}\n\nAhora por favor, escribe tu número de teléfono (ejemplo: 3001234567):`);
}

// Manejar entrada del teléfono
async function handlePhoneInput(message, phoneNumber, text) {
    const phone = text.trim().replace(/\D/g, ""); // Solo números

    // Validar longitud exacta de 10 dígitos
    if (phone.length !== 10) {
        await message.reply("❌ El número de teléfono debe tener exactamente 10 dígitos.\n\nPor favor, escribe tu número de teléfono (ejemplo: 3001234567):");
        return;
    }

    // Validar códigos de área de Colombia
    const validAreaCodes = [
        '300', '301', '302', '303', '304', '305', '310', '311', '312', '313', '314', '315', '316', '317', '318', '319',
        '320', '321', '322', '323', '324', '325', '350', '351', '352', '353', '354', '355', '356', '357', '358', '359',
        '360', '361', '362', '363', '364', '365', '366', '367', '368', '369', '370', '371', '372', '373', '374', '375',
        '376', '377', '378', '379', '380', '381', '382', '383', '384', '385', '386', '387', '388', '389', '390', '391',
        '392', '393', '394', '395', '396', '397', '398', '399'
    ];

    const areaCode = phone.substring(0, 3);
    if (!validAreaCodes.includes(areaCode)) {
        await message.reply("❌ Código de área inválido. Por favor, verifica que sea un número de celular colombiano válido.\n\nEjemplo: 3001234567");
        return;
    }

    // Validar que no sea un número con dígitos repetidos (ej: 1111111111)
    if (/^(\d)\1{9}$/.test(phone)) {
        await message.reply("❌ Número de teléfono inválido. Por favor, escribe un número válido.\n\nEjemplo: 3001234567");
        return;
    }

    conversationManager.updateConversationState(phoneNumber, {
        state: CONVERSATION_STATES.SELECTING_DATE,
        clientPhone: phone
    });

    await message.reply(`✅ Teléfono registrado: ${phone}\n\n¿Para qué fecha te gustaría agendar tu cita?\n\nEscribe la fecha en formato: DD/MM/AAAA o DD-MM-AAAA\nEjemplo: 15/12/2024 o 15-12-2024`);
}

// Manejar selección de fecha
async function handleDateSelection(message, phoneNumber, text) {
    const dateInput = text.trim();

    // Aceptar tanto guiones como barras
    let dateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    let match = dateInput.match(dateRegex);

    if (!match) {
        await message.reply("❌ Formato de fecha inválido. Por favor, usa el formato DD/MM/AAAA o DD-MM-AAAA\nEjemplo: 15/12/2024 o 15-12-2024");
        return;
    }

    const [, day, month, year] = match;
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Validar rango de valores
    if (monthNum < 1 || monthNum > 12) {
        await message.reply("❌ El mes debe estar entre 1 y 12. Por favor, corrige la fecha:\nEjemplo: 15/12/2024 o 15-12-2024");
        return;
    }

    if (dayNum < 1 || dayNum > 31) {
        await message.reply("❌ El día debe estar entre 1 y 31. Por favor, corrige la fecha:\nEjemplo: 15/12/2024 o 15-12-2024");
        return;
    }

    if (yearNum < 2024 || yearNum > 2030) {
        await message.reply("❌ El año debe estar entre 2024 y 2030. Por favor, corrige la fecha:\nEjemplo: 15/12/2024 o 15-12-2024");
        return;
    }

    // Crear fecha y validar que sea válida
    const selectedDate = new Date(yearNum, monthNum - 1, dayNum);

    // Verificar que la fecha creada coincida con los valores ingresados
    if (selectedDate.getDate() !== dayNum ||
        selectedDate.getMonth() !== (monthNum - 1) ||
        selectedDate.getFullYear() !== yearNum) {
        await message.reply("❌ Fecha inválida. Por favor, verifica que el día exista en ese mes:\nEjemplo: 15/12/2024 o 15-12-2024");
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        await message.reply("❌ No puedes agendar citas para fechas pasadas. Por favor, selecciona una fecha futura:");
        return;
    }

    conversationManager.updateConversationState(phoneNumber, {
        state: CONVERSATION_STATES.SELECTING_TIME,
        selectedDate: dateInput
    });

    // Obtener citas existentes para esta fecha del barbero seleccionado
    const conversationState = conversationManager.getConversationState(phoneNumber);
    const barberCalendarId = conversationState.selectedBarber.calendarId;
    const existingAppointments = await getExistingAppointments(calendarAuth, selectedDate, barberCalendarId);
    console.log(`📅 Citas existentes para ${dateInput} en ${barberCalendarId}:`, existingAppointments.length);

    const timeSlots = getAvailableTimeSlots(selectedDate, conversationManager.getConversationState(phoneNumber).selectedService.duration, existingAppointments);

    if (timeSlots.length === 0) {
        // Verificar si es el mismo día y es muy tarde
        const today = new Date();
        const isToday = selectedDate.toDateString() === today.toDateString();
        const currentHour = today.getHours();

        if (isToday && currentHour >= 19) {
            await message.reply(`❌ Ya es muy tarde para agendar citas para hoy (${dateInput}).\n\nSe necesita agendar con un mínimo de una hora de antelación y nuestro horario de atención termina a las 8:00 PM.\n\nPor favor, selecciona una fecha futura:`);
        } else {
            await message.reply(`❌ No hay horarios disponibles para el ${dateInput}.\n\nPor favor, selecciona otra fecha:`);
        }
        return;
    }

    // Organizar horarios en mañana y tarde
    const morningSlots = timeSlots.filter(time => {
        const hour = parseInt(time.split(':')[0]);
        return hour < 12;
    });

    const afternoonSlots = timeSlots.filter(time => {
        const hour = parseInt(time.split(':')[0]);
        return hour >= 12;
    });

    let timeOptions = "";
    let optionNumber = 1;

    if (morningSlots.length > 0) {
        timeOptions += "🌅 MAÑANA:\n";
        morningSlots.forEach(time => {
            timeOptions += `${optionNumber}. ${time}\n`;
            optionNumber++;
        });
        timeOptions += "\n";
    }

    if (afternoonSlots.length > 0) {
        timeOptions += "🌆 TARDE:\n";
        afternoonSlots.forEach(time => {
            timeOptions += `${optionNumber}. ${time}\n`;
            optionNumber++;
        });
    }

    await message.reply(`✅ Fecha seleccionada: ${dateInput}\n\nSelecciona un horario disponible:\n\n${timeOptions}\nResponde con el número de la opción que prefieras:`);
}

// Manejar selección de hora
async function handleTimeSelection(message, phoneNumber, text) {
    const timeOption = parseInt(text.trim());
    const conversationState = conversationManager.getConversationState(phoneNumber);

    // Convertir la fecha string a objeto Date
    const [day, month, year] = conversationState.selectedDate.split('/');
    const selectedDate = new Date(year, month - 1, day);

    // Obtener citas existentes para esta fecha del barbero seleccionado
    const barberCalendarId = conversationState.selectedBarber.calendarId;
    const existingAppointments = await getExistingAppointments(calendarAuth, selectedDate, barberCalendarId);
    const timeSlots = getAvailableTimeSlots(selectedDate, conversationState.selectedService.duration, existingAppointments);

    if (isNaN(timeOption) || timeOption < 1 || timeOption > Math.min(20, timeSlots.length)) {
        await message.reply("❌ Opción de horario inválida. Por favor, selecciona un número válido.\n\n💡 Si quieres empezar de nuevo, escribe 'hola' o 'menu'.");
        return;
    }

    const selectedTime = timeSlots[timeOption - 1];
    conversationManager.updateConversationState(phoneNumber, {
        state: CONVERSATION_STATES.CONFIRMING,
        selectedTime: selectedTime
    });

    await message.reply(conversationManager.getConfirmationMessage(phoneNumber));
}

// Manejar confirmación de cita
async function handleConfirmation(message, phoneNumber, text) {
    const response = text.toLowerCase().trim();

    if (response.includes("sí") || response.includes("si") || response.includes("confirmar") || response === "1") {
        await confirmAppointment(message, phoneNumber);
    } else if (response.includes("no") || response.includes("cancelar") || response === "2") {
        await cancelAppointment(message, phoneNumber);
    } else {
        await message.reply("❌ Por favor, responde con SÍ para confirmar o NO para cancelar.\n\n💡 Si quieres empezar de nuevo, escribe 'hola' o 'menu'.");
    }
}

// Confirmar cita y crear evento en calendario
async function confirmAppointment(message, phoneNumber) {
    try {
        const appointmentData = conversationManager.getAppointmentData(phoneNumber);
        const service = appointmentData.service;

        // Crear fecha y hora de la cita
        const [day, month, year] = appointmentData.date.split('/');
        const [hour, minute] = appointmentData.time.split(':');
        const appointmentDate = new Date(year, month - 1, day, hour, minute);
        const endDate = new Date(appointmentDate.getTime() + (service.duration * 60000));

        // Crear evento en Google Calendar del barbero seleccionado
        const barber = appointmentData.barber;
        const eventSummary = `${service.emoji} ${service.name} - ${appointmentData.clientName}`;
        const eventDescription = `Cliente: ${appointmentData.clientName}\nTeléfono: ${appointmentData.clientPhone}\nBarbero: ${barber.name}\nServicio: ${service.name}\nPrecio: $${service.price.toLocaleString()} COP\nDuración: ${service.duration} minutos`;

        const link = await createEvent(calendarAuth, {
            summary: eventSummary,
            description: eventDescription,
            startTime: appointmentDate,
            endTime: endDate,
            barberCalendarId: barber.calendarId
        });

        // Convertir hora a formato AM/PM para la confirmación final
        const hour24 = parseInt(hour);
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
        const ampm = hour24 >= 12 ? 'PM' : 'AM';
        const timeFormatted = `${hour12}:${minute} ${ampm}`;

        await message.reply(`🎉 ¡CITA CONFIRMADA! 🎉

        ✅ ${service.emoji} ${service.name}
        👤 Cliente: ${appointmentData.clientName}
        📞 Teléfono: ${appointmentData.clientPhone}
        👨‍💼 Barbero: ${barber.emoji} ${barber.name}
        📅 Fecha: ${appointmentData.date}
        🕐 Hora: ${timeFormatted}
        💰 Precio: $${service.price.toLocaleString()} COP
        ⏱️ Duración: ${service.duration} minutos

        ¡Te esperamos! 💈`
        );

        // Limpiar estado de conversación
        conversationManager.clearConversationState(phoneNumber);

    } catch (error) {
        console.error("Error creating appointment:", error);
        await message.reply("❌ Error al crear la cita. Por favor, intenta de nuevo más tarde.");
    }
}

// Cancelar cita
async function cancelAppointment(message, phoneNumber) {
    conversationManager.clearConversationState(phoneNumber);
    await message.reply("❌ Cita cancelada. Si cambias de opinión, puedes escribir 'hola' para comenzar de nuevo.");
}

// Inicializar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Servidor activo en puerto ${PORT} 🚀`);
  calendarAuth = await authorizeGoogle();

    // Inicializar WhatsApp
    client.initialize();
});