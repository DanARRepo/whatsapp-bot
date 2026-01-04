import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import express from "express";
import dotenv from "dotenv";
import { authorizeGoogle, createEvent, getExistingAppointments, findAppointmentsByClient, deleteAppointment } from "./googleCalendar.js";
import {
    SERVICES,
    BARBERS,
    CONVERSATION_STATES,
    getMainMenu,
    getSmartGreeting,
    getBarberMenu,
    getBarberMenuNatural,
    getServiceMenu,
    getServicesAndPrices,
    getServiceById,
    getBarberById,
    isWithinBusinessHours,
    getAvailableTimeSlots,
    getTimeSlotsNatural,
    getScheduleTypeMenu,
    getScheduleTypeMenuNatural,
    calculatePrice,
    isBreakTime,
    conflictsWithBreakTime,
    isExtraScheduleTime,
    identifyService,
    identifyBarber,
    getMainMenuWithButtons,
    getBarberMenuWithButtons,
    getServiceMenuWithButtons
} from "./services.js";
import ConversationManager from "./conversationManager.js";
import { processNaturalLanguage, isAIResponseReliable, parseNaturalDate, parseNaturalTime, parseNaturalDateAndTime, isAIEnabled, getAIProvider } from "./aiProviders/index.js";

// Cargar variables de entorno
dotenv.config();

// Función auxiliar para enviar mensajes con lenguaje natural cuando IA está habilitada
async function sendMessageWithNaturalLanguage(message, text, suggestions = []) {
    let messageText = text;
    
    if (suggestions.length > 0) {
        messageText += '\n\n💡 Puedes responder de forma natural, por ejemplo:\n';
        suggestions.forEach((suggestion, index) => {
            messageText += `• ${suggestion}\n`;
        });
    }
    
    await message.reply(messageText);
}

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

        // FILTRAR MENSAJES VACÍOS inmediatamente - evitar procesamiento innecesario
        const trimmedText = text.trim();
        if (!trimmedText || trimmedText.length === 0) {
            console.log(`⏭️ [${phoneNumber}] Mensaje vacío ignorado en el listener`);
            return;
        }

        console.log(`📨 [${phoneNumber}] Mensaje: "${trimmedText}"`);
        console.log(`🔍 [${phoneNumber}] Estado actual: ${conversationManager.getConversationState(phoneNumber).state}`);

        // Procesar mensaje de forma asíncrona para no bloquear otras sesiones
        setImmediate(async () => {
            try {
                await handleMessage(message, phoneNumber, trimmedText);
            } catch (error) {
                console.error(`❌ [${phoneNumber}] Error al procesar mensaje:`, error);
                await message.reply("❌ Ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.");
            }
        });
    } catch (error) {
        console.error("❌ Error general al procesar mensaje:", error);
    }
});

// Función principal para manejar mensajes
async function handleMessage(message, phoneNumber, text) {
    const conversationState = conversationManager.getConversationState(phoneNumber);

    console.log(`🔍 [${phoneNumber}] Estado actual: ${conversationState.state}`);
    console.log(`📝 [${phoneNumber}] Texto recibido: "${text}"`);

    // IGNORAR MENSAJES VACÍOS - evitar procesamiento innecesario
    const trimmedText = text.trim();
    if (!trimmedText || trimmedText.length === 0) {
        console.log(`⏭️ [${phoneNumber}] Mensaje vacío ignorado`);
        return;
    }

    // DETECTAR SALUDOS PRIMERO - antes que cualquier otra lógica
    const greetings = [
        "hola", "buenos días", "buenas tardes", "buenas noches",
        "buenas", "hey", "hi", "hello", "saludos", "inicio", "menu",
        "empezar", "comenzar", "nuevo", "otra vez", "oe", "oye"
    ];

    const isGreeting = greetings.some(greeting => trimmedText.includes(greeting));

    // Si es un saludo, reiniciar conversación INMEDIATAMENTE
    if (isGreeting) {
        console.log(`🔄 [${phoneNumber}] Saludo detectado, reiniciando conversación`);
        conversationManager.clearConversationState(phoneNumber);
        
        // Usar saludo inteligente si IA está habilitada, sino usar menú tradicional
        if (isAIEnabled()) {
            await message.reply(getSmartGreeting());
        } else {
            await showMainMenu(message, phoneNumber, trimmedText);
        }
        return;
    }

    // Procesar con IA si está habilitada (solo en estados iniciales)
    // IMPORTANTE: Solo procesar si NO es un saludo (ya se procesó arriba)
    if (isAIEnabled() && 
        (conversationState.state === CONVERSATION_STATES.MENU || 
         conversationState.state === CONVERSATION_STATES.SELECTING_BARBER) &&
        !isGreeting) {
        const aiResponse = await processNaturalLanguage(trimmedText, conversationState);
        
        if (aiResponse && isAIResponseReliable(aiResponse)) {
            console.log(`🤖 [${phoneNumber}] Respuesta de IA procesada:`, aiResponse);
            await handleAIResponse(message, phoneNumber, aiResponse);
            return;
        }
    }


    // Manejar según el estado actual de la conversación
    switch (conversationState.state) {
        case CONVERSATION_STATES.MENU:
            console.log(`🔄 [${phoneNumber}] Procesando selección de menú`);
            await handleMenuSelection(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.SELECTING_BARBER:
            console.log(`🔄 [${phoneNumber}] Procesando selección de barbero`);
            await handleBarberSelection(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.SELECTING_SERVICE:
            console.log(`🔄 [${phoneNumber}] Procesando selección de servicio`);
            await handleServiceSelection(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.COLLECTING_NAME:
            console.log(`🔄 [${phoneNumber}] Procesando entrada de nombre`);
            await handleNameInput(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.COLLECTING_PHONE:
            console.log(`🔄 [${phoneNumber}] Procesando entrada de teléfono`);
            await handlePhoneInput(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.SELECTING_DATE:
            console.log(`🔄 [${phoneNumber}] Procesando selección de fecha`);
            await handleDateSelection(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.SELECTING_SCHEDULE_TYPE:
            console.log(`🔄 [${phoneNumber}] Procesando selección de tipo de horario`);
            await handleScheduleTypeSelection(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.SELECTING_TIME:
            console.log(`🔄 [${phoneNumber}] Procesando selección de hora`);
            await handleTimeSelection(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.CONFIRMING:
            console.log(`🔄 [${phoneNumber}] Procesando confirmación`);
            await handleConfirmation(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.AMBIGUOUS_DATE:
            console.log(`🔄 [${phoneNumber}] Procesando fecha ambigua`);
            await handleAmbiguousDate(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.RESCHEDULING:
            console.log(`🔄 [${phoneNumber}] Procesando reagendamiento`);
            await handleRescheduleInput(message, phoneNumber, text);
            break;
        case CONVERSATION_STATES.CANCELLING:
            console.log(`🔄 [${phoneNumber}] Procesando cancelación`);
            await handleCancelInput(message, phoneNumber, text);
            break;
        default:
            console.log(`🔄 [${phoneNumber}] Estado desconocido, mostrando menú`);
            await showMainMenu(message, phoneNumber, text);
    }
}

// Manejar solicitudes ambiguas de servicios
async function handleAmbiguousServiceRequest(message, phoneNumber, text) {
    const conversationState = conversationManager.getConversationState(phoneNumber);
    
    console.log(`🤔 [${phoneNumber}] Manejando solicitud ambigua: "${text}"`);
    
    // Si no tenemos barbero seleccionado, preguntar por barbero
    if (!conversationState.selectedBarber) {
        conversationManager.updateConversationState(phoneNumber, {
            state: CONVERSATION_STATES.SELECTING_BARBER
        });
        if (isAIEnabled()) {
            await message.reply(`🤔 Entiendo que quieres agendar una cita. Para ayudarte mejor, necesito que selecciones tu barbero preferido:\n\n${getBarberMenuNatural()}`);
        } else {
            await message.reply(`🤔 Entiendo que quieres agendar una cita. Para ayudarte mejor, necesito que selecciones tu barbero preferido:\n\n${getBarberMenu()}`);
        }
        return;
    }
    
    // Si no tenemos servicio seleccionado, preguntar por servicio
    if (!conversationState.selectedService) {
        conversationManager.updateConversationState(phoneNumber, {
            state: CONVERSATION_STATES.COLLECTING_NAME
        });
        if (isAIEnabled()) {
            const serviceText = `🤔 Entiendo que quieres agendar una cita. Para ayudarte mejor, necesito que me digas qué servicio específico quieres:`;
            const suggestions = [
                "Corte de cabello",
                "Corte con barba", 
                "Servicio sencillo"
            ];
            await sendMessageWithNaturalLanguage(message, serviceText, suggestions);
        } else {
            await message.reply(`🤔 Entiendo que quieres agendar una cita. Para ayudarte mejor, necesito que selecciones el servicio específico:\n\n${getServiceMenu()}`);
        }
        return;
    }
    
    // Si tenemos barbero y servicio, continuar con el flujo normal
    if (conversationState.selectedBarber && conversationState.selectedService) {
        await message.reply(`✅ Perfecto! Ya tienes seleccionado:\n\n👨‍💼 Barbero: ${conversationState.selectedBarber.emoji} ${conversationState.selectedBarber.name}\n✂️ Servicio: ${conversationState.selectedService.emoji} ${conversationState.selectedService.name}\n\nPor favor, escribe tu nombre completo:`);
        return;
    }
}

// Manejar fechas ambiguas
async function handleAmbiguousDate(message, phoneNumber, text) {
    const conversationState = conversationManager.getConversationState(phoneNumber);
    
    console.log(`🤔 [${phoneNumber}] Manejando fecha ambigua: "${text}"`);
    
    // Procesar la fecha con IA si está habilitada
    if (isAIEnabled()) {
        const aiResponse = await processNaturalLanguage(text, conversationState);
        
        if (aiResponse && isAIResponseReliable(aiResponse) && aiResponse.date) {
            // Actualizar con la fecha específica
            conversationManager.updateConversationState(phoneNumber, {
                selectedDate: aiResponse.date,
                state: CONVERSATION_STATES.SELECTING_TIME
            });
            
            // Verificar si ya tenemos la hora
            if (conversationState.selectedTime) {
                // VALIDAR DISPONIBILIDAD ANTES DE PEDIR DATOS PERSONALES
                const [day, month, year] = aiResponse.date.split('/');
                const appointmentDate = new Date(year, month - 1, day);
                const existingAppointments = await getExistingAppointments(calendarAuth, appointmentDate, conversationState.selectedBarber.calendarId);
                
                // Verificar si el horario está ocupado
                const isTimeOccupied = existingAppointments.some(appointment => {
                    const appointmentTime = extractTimeFromAppointment(appointment);
                    return appointmentTime === conversationState.selectedTime;
                });
                
                if (isTimeOccupied) {
                    const scheduleType = conversationState.scheduleType || 'general';
            await message.reply(`❌ Lo siento, el horario ${conversationState.selectedTime} ya está ocupado para ${conversationState.selectedBarber.name}.\n\nPor favor, selecciona otro horario disponible:\n\n${getAvailableTimeSlots(appointmentDate, conversationState.selectedService.duration, existingAppointments, scheduleType).map((slot, index) => `${index + 1}. ${slot}`).join('\n')}`);
                    
                    // Volver al estado de selección de hora (preservar barbero, servicio y datos del cliente)
                    conversationManager.updateConversationState(phoneNumber, {
                        state: CONVERSATION_STATES.SELECTING_TIME,
                        selectedBarber: conversationState.selectedBarber,
                        selectedService: conversationState.selectedService,
                        clientName: conversationState.clientName,
                        clientPhone: conversationState.clientPhone
                    });
                    return;
                }
                
                // Si ya tenemos hora Y está disponible, ir directo a recopilar datos personales
                conversationManager.updateConversationState(phoneNumber, {
                    state: CONVERSATION_STATES.COLLECTING_NAME
                });
                await message.reply(`✅ Perfecto! Fecha confirmada: ${aiResponse.date}\n\n👨‍💼 Barbero: ${conversationState.selectedBarber.emoji} ${conversationState.selectedBarber.name}\n✂️ Servicio: ${conversationState.selectedService.emoji} ${conversationState.selectedService.name}\n📅 Fecha: ${aiResponse.date}\n🕐 Hora: ${conversationState.selectedTime}\n\nPor favor, escribe tu nombre completo:`);
            } else {
                await message.reply(`✅ Perfecto! Fecha confirmada: ${aiResponse.date}\n\n¿A qué hora te gustaría la cita?\n\nPuedes decirme:\n• "A las 2" o "a las 3 de la tarde"\n• "14:30" o "2:30 PM"`);
            }
            return;
        }
    }
    
    // Si no se pudo procesar con IA, usar lógica simple
    const lowerText = text.toLowerCase();
    
        if (lowerText.includes('hoy')) {
            const today = new Date();
            const dateString = today.toLocaleDateString('es-CO');
            conversationManager.updateConversationState(phoneNumber, {
                selectedDate: dateString,
                state: CONVERSATION_STATES.SELECTING_TIME
            });
            
            // Verificar si ya tenemos la hora
            if (conversationState.selectedTime) {
                // VALIDAR DISPONIBILIDAD ANTES DE PEDIR DATOS PERSONALES
                const existingAppointments = await getExistingAppointments(calendarAuth, today, conversationState.selectedBarber.calendarId);
                
                // Verificar si el horario está ocupado
                const isTimeOccupied = existingAppointments.some(appointment => {
                    const appointmentTime = extractTimeFromAppointment(appointment);
                    return appointmentTime === conversationState.selectedTime;
                });
                
                if (isTimeOccupied) {
                    const scheduleType = conversationState.scheduleType || 'general';
                    await message.reply(`❌ Lo siento, el horario ${conversationState.selectedTime} ya está ocupado para ${conversationState.selectedBarber.name}.\n\nPor favor, selecciona otro horario disponible:\n\n${getAvailableTimeSlots(today, conversationState.selectedService.duration, existingAppointments, scheduleType).map((slot, index) => `${index + 1}. ${slot}`).join('\n')}`);
                    
                    // Volver al estado de selección de hora (preservar barbero, servicio y datos del cliente)
                    conversationManager.updateConversationState(phoneNumber, {
                        state: CONVERSATION_STATES.SELECTING_TIME,
                        selectedBarber: conversationState.selectedBarber,
                        selectedService: conversationState.selectedService,
                        clientName: conversationState.clientName,
                        clientPhone: conversationState.clientPhone
                    });
                    return;
                }
                
                // Si ya tenemos hora Y está disponible, ir directo a recopilar datos personales
                conversationManager.updateConversationState(phoneNumber, {
                    state: CONVERSATION_STATES.COLLECTING_NAME
                });
                await message.reply(`✅ Perfecto! Fecha confirmada: ${dateString}\n\n👨‍💼 Barbero: ${conversationState.selectedBarber.emoji} ${conversationState.selectedBarber.name}\n✂️ Servicio: ${conversationState.selectedService.emoji} ${conversationState.selectedService.name}\n📅 Fecha: ${dateString}\n🕐 Hora: ${conversationState.selectedTime}\n\nPor favor, escribe tu nombre completo:`);
            } else {
                await message.reply(`✅ Perfecto! Fecha confirmada: ${dateString}\n\n¿A qué hora te gustaría la cita?`);
            }
        } else if (lowerText.includes('mañana')) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateString = tomorrow.toLocaleDateString('es-CO');
            conversationManager.updateConversationState(phoneNumber, {
                selectedDate: dateString,
                state: CONVERSATION_STATES.SELECTING_TIME
            });
            
            // Verificar si ya tenemos la hora
            if (conversationState.selectedTime) {
                // VALIDAR DISPONIBILIDAD ANTES DE PEDIR DATOS PERSONALES
                const existingAppointments = await getExistingAppointments(calendarAuth, tomorrow, conversationState.selectedBarber.calendarId);
                
                // Verificar si el horario está ocupado
                const isTimeOccupied = existingAppointments.some(appointment => {
                    const appointmentTime = extractTimeFromAppointment(appointment);
                    return appointmentTime === conversationState.selectedTime;
                });
                
                if (isTimeOccupied) {
                    const scheduleType = conversationState.scheduleType || 'general';
                    await message.reply(`❌ Lo siento, el horario ${conversationState.selectedTime} ya está ocupado para ${conversationState.selectedBarber.name}.\n\nPor favor, selecciona otro horario disponible:\n\n${getAvailableTimeSlots(tomorrow, conversationState.selectedService.duration, existingAppointments, scheduleType).map((slot, index) => `${index + 1}. ${slot}`).join('\n')}`);
                    
                    // Volver al estado de selección de hora (preservar barbero, servicio y datos del cliente)
                    conversationManager.updateConversationState(phoneNumber, {
                        state: CONVERSATION_STATES.SELECTING_TIME,
                        selectedBarber: conversationState.selectedBarber,
                        selectedService: conversationState.selectedService,
                        clientName: conversationState.clientName,
                        clientPhone: conversationState.clientPhone
                    });
                    return;
                }
                
                // Si ya tenemos hora Y está disponible, ir directo a recopilar datos personales
                conversationManager.updateConversationState(phoneNumber, {
                    state: CONVERSATION_STATES.COLLECTING_NAME
                });
                await message.reply(`✅ Perfecto! Fecha confirmada: ${dateString}\n\n👨‍💼 Barbero: ${conversationState.selectedBarber.emoji} ${conversationState.selectedBarber.name}\n✂️ Servicio: ${conversationState.selectedService.emoji} ${conversationState.selectedService.name}\n📅 Fecha: ${dateString}\n🕐 Hora: ${conversationState.selectedTime}\n\nPor favor, escribe tu nombre completo:`);
            } else {
                await message.reply(`✅ Perfecto! Fecha confirmada: ${dateString}\n\n¿A qué hora te gustaría la cita?`);
            }
    } else {
        await message.reply(`🤔 No entendí la fecha. Por favor, dime:\n\n• "Hoy" o "mañana"\n• "El próximo martes" o "el viernes"\n• "15 de diciembre" o "el 20"\n• O cualquier fecha que prefieras`);
    }
}

// Manejar respuestas de IA
async function handleAIResponse(message, phoneNumber, aiResponse) {
    const { intent, barber, service, date, time, needs_info, ambiguous_date } = aiResponse;
    
    console.log(`🤖 Procesando intención: ${intent}`);
    console.log(`🤖 Fecha ambigua: ${ambiguous_date}`);
    
    switch (intent) {
        case 'book_appointment':
            await handleAIBooking(message, phoneNumber, aiResponse);
            break;
            
        case 'greeting':
            conversationManager.clearConversationState(phoneNumber);
            // Usar saludo inteligente si IA está habilitada, sino usar menú tradicional
            if (isAIEnabled()) {
                await message.reply(getSmartGreeting());
            } else {
                await showMainMenu(message, phoneNumber, "hola");
            }
            break;
            
        case 'ask_services':
        case 'ask_prices':
            // Obtener estado actual de la conversación
            const currentConversationStateForServices = conversationManager.getConversationState(phoneNumber);
            // Si estamos en proceso de agendamiento, mostrar servicios de forma contextual
            if (currentConversationStateForServices.state === CONVERSATION_STATES.SELECTING_SERVICE || 
                currentConversationStateForServices.state === CONVERSATION_STATES.SELECTING_BARBER) {
                await message.reply(`${getServicesAndPrices()}\n\n¿Cuál servicio prefieres?`);
            } else {
                await message.reply(getServicesAndPrices());
            }
            break;
            
        case 'ask_barbers':
            // Obtener estado actual de la conversación
            const currentConversationState = conversationManager.getConversationState(phoneNumber);
            // Si estamos en proceso de agendamiento, mostrar barberos de forma contextual
            if (currentConversationState.state === CONVERSATION_STATES.SELECTING_BARBER || 
                currentConversationState.state === CONVERSATION_STATES.SELECTING_SERVICE) {
                await message.reply(getBarberMenuNatural());
            } else {
                await message.reply(getBarberMenuNatural());
            }
            break;
            
        case 'reschedule':
            await handleReschedule(message, phoneNumber);
            break;
            
        case 'cancel':
            await handleCancel(message, phoneNumber);
            break;
            
        default:
            await message.reply("No entendí tu solicitud. ¿Podrías ser más específico? Escribe 'hola' para ver las opciones disponibles.");
    }
}

// Manejar agendamiento con IA
async function handleAIBooking(message, phoneNumber, aiResponse) {
    const { barber, service, date, time, needs_info, ambiguous_date, scheduleType } = aiResponse;
    
    // Si tenemos fecha ambigua, preguntar por la fecha específica
    if (ambiguous_date && !date) {
        await message.reply(`🤔 Entiendo que quieres agendar para las ${time || 'una hora específica'}, pero necesito saber para qué día.\n\n¿Es para hoy, mañana, o qué día específico?`);
        return;
    }
    
    // Si tenemos toda la información necesaria, procesar agendamiento directo
    if (barber && service && date && time && !needs_info.includes('name') && !needs_info.includes('phone')) {
        await processDirectBooking(message, phoneNumber, aiResponse);
        return;
    }
    
    // Si tenemos información parcial, actualizar estado y completar paso a paso
    if (barber || service || date || time) {
        await completeBookingInfo(message, phoneNumber, aiResponse);
        return;
    }
    
    // Si no tenemos información, guiar al usuario paso a paso
    await completeBookingInfo(message, phoneNumber, aiResponse);
}

// Procesar agendamiento directo con IA
async function processDirectBooking(message, phoneNumber, aiResponse) {
    const { barber, service, date, time } = aiResponse;
    
    // Encontrar barbero y servicio usando las funciones de identificación
    const selectedBarber = identifyBarber(barber) || Object.values(BARBERS).find(b => b.name === barber);
    const selectedService = identifyService(service) || Object.values(SERVICES).find(s => s.name === service);
    
    if (!selectedBarber || !selectedService) {
        await message.reply("❌ No pude encontrar el barbero o servicio especificado. Por favor, intenta de nuevo.");
        return;
    }
    
    // VALIDACIÓN: Verificar que el horario esté disponible
    const [day, month, year] = date.split('/');
    const appointmentDate = new Date(year, month - 1, day);
    const existingAppointments = await getExistingAppointments(calendarAuth, appointmentDate, selectedBarber.calendarId);
    
    // Verificar si el horario está ocupado
    const isTimeOccupied = existingAppointments.some(appointment => {
        const appointmentTime = extractTimeFromAppointment(appointment);
        return appointmentTime === time;
    });
    
    if (isTimeOccupied) {
        const scheduleType = conversationState.scheduleType || 'general';
        const timeSlots = getAvailableTimeSlots(appointmentDate, selectedService.duration, existingAppointments, scheduleType);
        await message.reply(`❌ Lo siento, el horario ${time} ya está ocupado para ${selectedBarber.name}.\n\nPor favor, selecciona otro horario disponible:\n\n${timeSlots.map((slot, index) => `${index + 1}. ${slot}`).join('\n')}`);
        
        // Actualizar estado a SELECTING_TIME para permitir selección de nueva hora (preservar toda la información)
        const currentState = conversationManager.getConversationState(phoneNumber);
        conversationManager.updateConversationState(phoneNumber, {
            state: CONVERSATION_STATES.SELECTING_TIME,
            selectedBarber: selectedBarber,
            selectedService: selectedService,
            selectedDate: date,
            clientName: currentState.clientName,
            clientPhone: currentState.clientPhone
        });
        return;
    }

    // Actualizar estado de conversación
    conversationManager.updateConversationState(phoneNumber, {
        state: CONVERSATION_STATES.COLLECTING_NAME,
        selectedBarber: selectedBarber,
        selectedService: selectedService,
        selectedDate: date,
        selectedTime: time
    });
    
    await message.reply(`🤖 ¡Perfecto! He entendido tu solicitud:

👨‍💼 Barbero: ${selectedBarber.emoji} ${selectedBarber.name}
✂️ Servicio: ${selectedService.emoji} ${selectedService.name}
📅 Fecha: ${date}
🕐 Hora: ${time}

Ahora necesito algunos datos tuyos:
Por favor, escribe tu nombre completo:`);
}

// Completar información faltante
async function completeBookingInfo(message, phoneNumber, aiResponse) {
    const { barber, service, date, time, needs_info, ambiguous_date, scheduleType } = aiResponse;
    
    // Obtener estado actual de la conversación
    const conversationState = conversationManager.getConversationState(phoneNumber);
    
    // Actualizar estado con la información disponible
    const updates = {};
    
    if (barber) {
        const selectedBarber = identifyBarber(barber) || Object.values(BARBERS).find(b => b.name === barber);
        if (selectedBarber) updates.selectedBarber = selectedBarber;
    }
    
    if (service) {
        console.log(`🔍 completeBookingInfo - Intentando identificar servicio: "${service}"`);
        const selectedService = identifyService(service) || Object.values(SERVICES).find(s => s.name === service);
        console.log(`🔍 completeBookingInfo - Servicio identificado:`, selectedService);
        if (selectedService) updates.selectedService = selectedService;
    }
    
    if (date) updates.selectedDate = date;
    if (time) updates.selectedTime = time;
    if (scheduleType) updates.scheduleType = scheduleType;
    
    // VALIDACIÓN: Verificar si es horario extra y mostrar advertencia
    if (time && isExtraScheduleTime(time) && scheduleType !== 'extra') {
        console.log(`🔍 [${phoneNumber}] completeBookingInfo - Detectado horario extra: ${time}`);
        const service = updates.selectedService || conversationState.selectedService;
        if (service) {
            const extraPrice = service.price * 2;
            
            await message.reply(`⚠️ ADVERTENCIA: Has seleccionado un horario extra (${time}).\n\n🌙 Este horario tiene un precio doble:\n💰 Precio normal: $${service.price.toLocaleString()} COP\n💰 Precio extra: $${extraPrice.toLocaleString()} COP\n\n¿Confirmas que quieres continuar con este horario extra?`);
            
            // Actualizar el tipo de horario a extra
            updates.scheduleType = 'extra';
        }
    }
    
    // Si tenemos fecha ambigua, marcar que necesitamos fecha específica
    if (ambiguous_date && !date) {
        updates.needsSpecificDate = true;
    }
    
    // Determinar el siguiente paso basado en lo que falta
    let nextStep = "";
    let nextState = CONVERSATION_STATES.MENU;
    
    // Si tenemos fecha ambigua, preguntar por fecha específica primero
    if (updates.needsSpecificDate) {
        nextStep = `🤔 Entiendo que quieres agendar para las ${time || 'una hora específica'}, pero necesito saber para qué día.\n\n¿Es para hoy, mañana, o qué día específico?`;
        nextState = CONVERSATION_STATES.AMBIGUOUS_DATE;
    }
    // Si solo faltan datos personales, ir directo a recopilar nombre
    else if (!needs_info.includes('barber') && !needs_info.includes('service') && !needs_info.includes('date') && !needs_info.includes('time')) {
        // VALIDAR DISPONIBILIDAD ANTES DE PEDIR DATOS PERSONALES
        if (updates.selectedDate && updates.selectedTime && updates.selectedBarber && updates.selectedService) {
            const [day, month, year] = updates.selectedDate.split('/');
            const appointmentDate = new Date(year, month - 1, day);
            const existingAppointments = await getExistingAppointments(calendarAuth, appointmentDate, updates.selectedBarber.calendarId);
            
            // Verificar si el horario está ocupado
            const isTimeOccupied = existingAppointments.some(appointment => {
                const appointmentTime = extractTimeFromAppointment(appointment);
                return appointmentTime === updates.selectedTime;
            });
            
            if (isTimeOccupied) {
                const scheduleType = conversationState.scheduleType || 'general';
                await message.reply(`❌ Lo siento, el horario ${updates.selectedTime} ya está ocupado para ${updates.selectedBarber.name}.\n\nPor favor, selecciona otro horario disponible:\n\n${getAvailableTimeSlots(appointmentDate, updates.selectedService.duration, existingAppointments, scheduleType).map((slot, index) => `${index + 1}. ${slot}`).join('\n')}`);
                
                // Volver al estado de selección de hora (preservar barbero, servicio y datos del cliente)
                const currentState = conversationManager.getConversationState(phoneNumber);
                updates.state = CONVERSATION_STATES.SELECTING_TIME;
                updates.selectedBarber = currentState.selectedBarber;
                updates.selectedService = currentState.selectedService;
                updates.clientName = currentState.clientName;
                updates.clientPhone = currentState.clientPhone;
                conversationManager.updateConversationState(phoneNumber, updates);
                return;
            }
        }
        
        if (needs_info.includes('name')) {
            nextStep = "Por favor, escribe tu nombre completo:";
            nextState = CONVERSATION_STATES.COLLECTING_NAME;
        } else if (needs_info.includes('phone')) {
            nextStep = "Ahora por favor, escribe tu número de teléfono (ejemplo: 3001234567):";
            nextState = CONVERSATION_STATES.COLLECTING_PHONE;
        }
    } else {
        // Si falta información de cita, preguntar por orden de prioridad
        // PERO solo si no la tenemos ya en el estado actual
        console.log(`🤖 completeBookingInfo - needs_info: ${JSON.stringify(needs_info)}`);
        console.log(`🤖 completeBookingInfo - updates.selectedBarber: ${updates.selectedBarber}`);
        console.log(`🤖 completeBookingInfo - updates.selectedService: ${updates.selectedService}`);
        
        if (needs_info.includes('barber') && !updates.selectedBarber) {
            if (isAIEnabled()) {
                nextStep = "¿Con qué barbero quieres agendar tu cita?";
                nextState = CONVERSATION_STATES.SELECTING_BARBER;
            } else {
                if (isAIEnabled()) {
                    nextStep = "Primero, selecciona tu barbero preferido:\n\n" + getBarberMenuNatural();
                } else {
                    nextStep = "Primero, selecciona tu barbero preferido:\n\n" + getBarberMenu();
                }
                nextState = CONVERSATION_STATES.SELECTING_BARBER;
            }
        } else if (needs_info.includes('service') && !updates.selectedService) {
            if (isAIEnabled()) {
                nextStep = "¿Qué servicio quieres?";
                nextState = CONVERSATION_STATES.SELECTING_SERVICE;
            } else {
                nextStep = "Ahora selecciona el servicio que deseas:\n\n" + getServiceMenu();
                nextState = CONVERSATION_STATES.SELECTING_SERVICE;
            }
        // scheduleType se detecta automáticamente basándose en la hora, no se pregunta al usuario
        } else if (needs_info.includes('date') && !updates.selectedDate && !conversationState.selectedDate) {
            nextStep = "¿Para qué fecha te gustaría agendar tu cita?\n\nPuedes decirme:\n• \"Hoy\" o \"mañana\"\n• \"El próximo martes\" o \"el viernes\"\n• \"15 de diciembre\" o \"el 20\"\n• O cualquier fecha que prefieras";
            nextState = CONVERSATION_STATES.SELECTING_DATE;
        } else if (needs_info.includes('time') && !updates.selectedTime) {
            nextStep = "¿A qué hora te gustaría la cita?\n\nPuedes decirme:\n• \"A las 2\" o \"a las 3 de la tarde\"\n• \"14:30\" o \"2:30 PM\"";
            nextState = CONVERSATION_STATES.SELECTING_TIME;
            // Preservar información del barbero y servicio (usar el identificado si está disponible)
            if (!updates.selectedBarber) {
                updates.selectedBarber = conversationState.selectedBarber;
            }
            if (!updates.selectedService) {
                updates.selectedService = conversationState.selectedService;
            }
        } else if (needs_info.includes('name')) {
            nextStep = "Por favor, escribe tu nombre completo:";
            nextState = CONVERSATION_STATES.COLLECTING_NAME;
        } else if (needs_info.includes('phone')) {
            nextStep = "Ahora por favor, escribe tu número de teléfono (ejemplo: 3001234567):";
            nextState = CONVERSATION_STATES.COLLECTING_PHONE;
        }
    }
    
    updates.state = nextState;
    conversationManager.updateConversationState(phoneNumber, updates);
    
    // Mostrar resumen de lo que ya tenemos (usar estado completo, no solo updates)
    const currentState = conversationManager.getConversationState(phoneNumber);
    let summary = "";
    if (currentState.selectedBarber) summary += `👨‍💼 Barbero: ${currentState.selectedBarber.emoji} ${currentState.selectedBarber.name}\n`;
    if (currentState.selectedService) summary += `✂️ Servicio: ${currentState.selectedService.emoji} ${currentState.selectedService.name}\n`;
    if (currentState.selectedDate) summary += `📅 Fecha: ${currentState.selectedDate}\n`;
    if (currentState.selectedTime) summary += `🕐 Hora: ${currentState.selectedTime}\n`;
    
    console.log(`🤖 completeBookingInfo - nextStep: "${nextStep}"`);
    console.log(`🤖 completeBookingInfo - nextState: "${nextState}"`);
    console.log(`🤖 completeBookingInfo - summary: "${summary}"`);
    
    if (summary) {
        await message.reply(`🤖 ¡Perfecto! He entendido tu solicitud:\n\n${summary}\n${nextStep}`);
    } else {
        await message.reply(`🤖 Entiendo que quieres agendar una cita. ${nextStep}`);
    }
}

// Mostrar menú principal
async function showMainMenu(message, phoneNumber, text) {
    conversationManager.updateConversationState(phoneNumber, { state: CONVERSATION_STATES.MENU });

    // Detectar si es un saludo para personalizar la respuesta
    const greetings = [
        "hola", "buenos días", "buenas tardes", "buenas noches",
        "buenas", "hey", "hi", "hello", "saludos", "inicio", "menu",
        "empezar", "comenzar", "nuevo", "otra vez"
    ];

    const isGreeting = greetings.some(greeting => text.toLowerCase().includes(greeting));

    if (isGreeting) {
        // Usar lenguaje natural si la IA está habilitada, sino usar menú tradicional
        if (isAIEnabled()) {
            await message.reply(getSmartGreeting());
        } else {
            await message.reply(getMainMenu());
        }
    }
}

// Manejar selección del menú
async function handleMenuSelection(message, phoneNumber, text) {
    const option = text.trim();

    // Detectar casos ambiguos de servicios
    const ambiguousServiceRequests = [
        "turno", "turnito", "cita", "agendar", "reservar", "reserva",
        "motilada", "corte", "cortar", "cortarme", "arreglar", "arreglarme",
        "servicio", "atender", "visitar", "pasar", "ir", "quiero", "necesito"
    ];

    const isAmbiguousService = ambiguousServiceRequests.some(ambiguous => text.includes(ambiguous));

    // Manejar opciones numéricas o lenguaje natural
    if (option === "1" || option === "book_appointment" || isAmbiguousService) {
        // Agendar cita - mostrar menú de barberos
        conversationManager.updateConversationState(phoneNumber, {
            state: CONVERSATION_STATES.SELECTING_BARBER
        });
        
        if (isAmbiguousService) {
            if (isAIEnabled()) {
                const barberText = `🤔 Entiendo que quieres agendar una cita. Para ayudarte mejor, necesito que me digas con qué barbero quieres agendar:`;
                const suggestions = [
                    "Con Mauricio",
                    "Con Stiven",
                    "Cualquiera está bien"
                ];
                await sendMessageWithNaturalLanguage(message, barberText, suggestions);
            } else {
                if (isAIEnabled()) {
                    await message.reply(`🤔 Entiendo que quieres agendar una cita. Para ayudarte mejor, necesito que selecciones tu barbero preferido:\n\n${getBarberMenuNatural()}`);
                } else {
                    await message.reply(`🤔 Entiendo que quieres agendar una cita. Para ayudarte mejor, necesito que selecciones tu barbero preferido:\n\n${getBarberMenu()}`);
                }
            }
        } else {
            if (isAIEnabled()) {
                const barberText = `👨‍💼 ¿Con qué barbero quieres agendar tu cita?`;
                const suggestions = [
                    "Con Mauricio",
                    "Con Stiven"
                ];
                await sendMessageWithNaturalLanguage(message, barberText, suggestions);
            } else {
                if (isAIEnabled()) {
                    await message.reply(getBarberMenuNatural());
                } else {
                    await message.reply(getBarberMenu());
                }
            }
        }
    } else if (option === "2" || option === "view_services") {
        // Mostrar servicios y precios
        await message.reply(getServicesAndPrices());
    } else {
        // Detectar si es una solicitud de información
        const infoRequests = ["servicios", "precios", "que tienen", "que ofrecen", "informacion", "ayuda"];
        const isInfoRequest = infoRequests.some(info => text.includes(info));
        
        if (isInfoRequest) {
            await message.reply(getServicesAndPrices());
        } else {
            await message.reply("❌ Opción no válida. Por favor, responde con 1 o 2.\n\n💡 Si quieres empezar de nuevo, escribe 'hola' o 'menu'.");
        }
    }
}

// Manejar selección de servicio
async function handleServiceSelection(message, phoneNumber, text) {
    const conversationState = conversationManager.getConversationState(phoneNumber);
    
    console.log(`🔍 handleServiceSelection - Texto: "${text}"`);
    
    // Intentar identificar el servicio usando IA si está habilitada
    if (isAIEnabled()) {
        try {
            const aiResponse = await processNaturalLanguage(text, conversationState);
            console.log(`🤖 handleServiceSelection - Respuesta IA:`, aiResponse);
            
            if (aiResponse.intent === 'book_appointment' && aiResponse.service) {
                const selectedService = identifyService(aiResponse.service);
                if (selectedService) {
                    conversationManager.updateConversationState(phoneNumber, {
                        selectedService: selectedService,
                        state: CONVERSATION_STATES.SELECTING_DATE
                    });
                    
                    // Verificar si ya tenemos fecha
                    if (conversationState.selectedDate) {
                        await message.reply(`¡Perfecto! He entendido tu solicitud:\n\nBarbero: ${conversationState.selectedBarber.emoji} ${conversationState.selectedBarber.name}\nServicio: ${selectedService.emoji} ${selectedService.name}\nFecha: 📅 ${conversationState.selectedDate}\n\n¿A qué hora te gustaría la cita?\n\nPuedes decirme:\n• "A las 2" o "a las 3 de la tarde"\n• "14:30" o "2:30 PM"`);
                        conversationManager.updateConversationState(phoneNumber, {
                            state: CONVERSATION_STATES.SELECTING_TIME
                        });
                    } else {
                        await message.reply(`¡Perfecto! He entendido tu solicitud:\n\nBarbero: ${conversationState.selectedBarber.emoji} ${conversationState.selectedBarber.name}\nServicio: ${selectedService.emoji} ${selectedService.name}\n\n¿Para qué fecha te gustaría agendar tu cita?\n\nPuedes decirme:\n• "Hoy" o "mañana"\n• "El próximo martes" o "el viernes"\n• "15 de diciembre" o "el 20"\n• O cualquier fecha que prefieras`);
                        conversationManager.updateConversationState(phoneNumber, {
                            state: CONVERSATION_STATES.SELECTING_DATE
                        });
                    }
                    return;
                }
            }
        } catch (error) {
            console.error(`❌ Error procesando servicio con IA:`, error);
        }
    }
    
    // Fallback: intentar identificar servicio directamente
    const selectedService = identifyService(text);
    if (selectedService) {
        // Verificar si ya tenemos fecha
        if (conversationState.selectedDate) {
            await message.reply(`¡Perfecto! He entendido tu solicitud:\n\nBarbero: ${conversationState.selectedBarber.emoji} ${conversationState.selectedBarber.name}\nServicio: ${selectedService.emoji} ${selectedService.name}\nFecha: 📅 ${conversationState.selectedDate}\n\n¿A qué hora te gustaría la cita?\n\nPuedes decirme:\n• "A las 2" o "a las 3 de la tarde"\n• "14:30" o "2:30 PM"`);
            conversationManager.updateConversationState(phoneNumber, {
                selectedService: selectedService,
                state: CONVERSATION_STATES.SELECTING_TIME
            });
        } else {
            await message.reply(`¡Perfecto! He entendido tu solicitud:\n\nBarbero: ${conversationState.selectedBarber.emoji} ${conversationState.selectedBarber.name}\nServicio: ${selectedService.emoji} ${selectedService.name}\n\n¿Para qué fecha te gustaría agendar tu cita?\n\nPuedes decirme:\n• "Hoy" o "mañana"\n• "El próximo martes" o "el viernes"\n• "15 de diciembre" o "el 20"\n• O cualquier fecha que prefieras`);
            conversationManager.updateConversationState(phoneNumber, {
                selectedService: selectedService,
                state: CONVERSATION_STATES.SELECTING_DATE
            });
        }
    } else {
        await message.reply(`📋 Aquí tienes nuestros servicios disponibles:\n\n${getServicesAndPrices()}\n\n¿Cuál servicio te gustaría?`);
    }
}

// Manejar selección de barbero
async function handleBarberSelection(message, phoneNumber, text) {
    const option = text.trim();

    // Detectar nombres de barberos en el texto
    const barberNames = Object.values(BARBERS).map(b => b.name.toLowerCase());
    const mentionedBarber = barberNames.find(name => text.includes(name));

    if (option === "1" || option === "barber_1" || mentionedBarber === BARBERS.BARBER_1.name.toLowerCase()) {
        // Seleccionar Mauricio
        const barber = BARBERS.BARBER_1;
        conversationManager.updateConversationState(phoneNumber, {
            state: CONVERSATION_STATES.COLLECTING_NAME,
            selectedBarber: barber
        });
        
        if (isAIEnabled()) {
            const serviceText = `👨‍💼 Perfecto! Has seleccionado a ${barber.emoji} ${barber.name}\n\n¿Qué servicio quieres?`;
            const suggestions = [
                "Corte de cabello",
                "Corte con barba", 
                "Servicio sencillo"
            ];
            await sendMessageWithNaturalLanguage(message, serviceText, suggestions);
        } else {
            await message.reply(`👨‍💼 Perfecto! Has seleccionado a ${barber.name}\n\nAhora selecciona el servicio que deseas:\n\n${getServiceMenu()}`);
        }
    } else if (option === "2" || option === "barber_2" || mentionedBarber === BARBERS.BARBER_2.name.toLowerCase()) {
        // Seleccionar Stiven
        const barber = BARBERS.BARBER_2;
        conversationManager.updateConversationState(phoneNumber, {
            state: CONVERSATION_STATES.COLLECTING_NAME,
            selectedBarber: barber
        });
        
        if (isAIEnabled()) {
            const serviceText = `👨‍💼 Perfecto! Has seleccionado a ${barber.emoji} ${barber.name}\n\n¿Qué servicio quieres?`;
            const suggestions = [
                "Corte de cabello",
                "Corte con barba", 
                "Servicio sencillo"
            ];
            await sendMessageWithNaturalLanguage(message, serviceText, suggestions);
        } else {
            await message.reply(`👨‍💼 Perfecto! Has seleccionado a ${barber.name}\n\nAhora selecciona el servicio que deseas:\n\n${getServiceMenu()}`);
        }
    } else {
        // Detectar si es una solicitud de información
        const infoRequests = ["servicios", "precios", "que tienen", "que ofrecen", "informacion", "ayuda"];
        const isInfoRequest = infoRequests.some(info => text.includes(info));
        
        if (isInfoRequest) {
            await message.reply(getServicesAndPrices());
        } else {
            await message.reply("❌ Opción no válida. Por favor, responde con 1 o 2.\n\n💡 Si quieres empezar de nuevo, escribe 'hola' o 'menu'.");
        }
    }
}

// Manejar entrada del nombre
async function handleNameInput(message, phoneNumber, text) {
    const name = text.trim();
    const conversationState = conversationManager.getConversationState(phoneNumber);
    
    console.log(`🔍 handleNameInput - Estado: ${conversationState.state}, Texto: "${text}"`);
    
    // Verificar si es una selección de servicio (solo si venimos de selección de barbero Y no tenemos servicio)
    if (conversationState.state === CONVERSATION_STATES.COLLECTING_NAME && 
        !conversationState.selectedService &&
        (text === "1" || text === "2" || text === "3" || text === "service_1" || text === "service_2" || text === "service_3")) {
        let service;
        
        if (text === "1" || text === "service_1") {
            service = SERVICES.SIMPLE_CUT;
        } else if (text === "2" || text === "service_2") {
            service = SERVICES.CUT_WITH_BEARD;
        } else if (text === "3" || text === "service_3") {
            service = SERVICES.SIMPLE_SERVICE;
        }
        
        if (service) {
            conversationManager.updateConversationState(phoneNumber, {
                selectedService: service
            });
            if (isAIEnabled()) {
                const nameText = `✂️ Perfecto! Has seleccionado: ${service.emoji} ${service.name}\n💰 Precio: $${service.price.toLocaleString()} COP\n⏱️ Duración: ${service.duration} minutos\n\n¿Cuál es tu nombre completo?`;
                const suggestions = [
                    "Mi nombre es [tu nombre]",
                    "Soy [tu nombre]"
                ];
                await sendMessageWithNaturalLanguage(message, nameText, suggestions);
            } else {
                await message.reply(`✂️ Perfecto! Has seleccionado: ${service.emoji} ${service.name}\n💰 Precio: $${service.price.toLocaleString()} COP\n⏱️ Duración: ${service.duration} minutos\n\nPor favor, escribe tu nombre completo:`);
            }
            return;
        }
    }

    // Detectar si es una solicitud de servicio ambigua
    const ambiguousServiceRequests = [
        "turno", "turnito", "cita", "agendar", "reservar", "reserva",
        "motilada", "corte", "cortar", "cortarme", "arreglar", "arreglarme",
        "servicio", "atender", "visitar", "pasar", "ir", "quiero", "necesito"
    ];

    const isAmbiguousService = ambiguousServiceRequests.some(ambiguous => text.includes(ambiguous));

    if (isAmbiguousService && !conversationState.selectedService) {
        if (isAIEnabled()) {
            const serviceText = `🤔 Entiendo que quieres agendar una cita. Para ayudarte mejor, necesito que me digas qué servicio específico quieres:`;
            const suggestions = [
                "Corte de cabello",
                "Corte con barba", 
                "Servicio sencillo"
            ];
            await sendMessageWithNaturalLanguage(message, serviceText, suggestions);
        } else {
            await message.reply(`🤔 Entiendo que quieres agendar una cita. Para ayudarte mejor, necesito que selecciones el servicio específico:\n\n${getServiceMenu()}`);
        }
        return;
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

    // Extraer el número de WhatsApp del usuario (sin el @c.us)
    const whatsappNumber = phoneNumber.replace("@c.us", "");
    
    // Usar lenguaje natural si la IA está habilitada, sino usar opciones numéricas
    if (isAIEnabled()) {
        const phoneText = `✅ Nombre registrado: ${name}\n\n¿Qué número de teléfono quieres usar para la cita?`;
        const suggestions = [
            `Usar mi número actual: ${whatsappNumber}`,
            "Registrar un número diferente"
        ];
        await sendMessageWithNaturalLanguage(message, phoneText, suggestions);
    } else {
        await message.reply(`✅ Nombre registrado: ${name}\n\n¿Qué número de teléfono quieres usar para la cita?\n\n1. 📱 Usar mi número actual: ${whatsappNumber}\n2. ✏️ Registrar un número diferente\n\nResponde con 1 o 2:`);
    }
}

// Manejar entrada del teléfono
async function handlePhoneInput(message, phoneNumber, text) {
    const input = text.trim();
    
    // PRIMERO: Verificar si el input es un número de teléfono válido (10 dígitos)
    const phoneRegex = /^\d{10}$/;
    if (phoneRegex.test(input)) {
        console.log(`📱 [${phoneNumber}] Número de teléfono detectado directamente: ${input}`);
        await processPhoneNumber(message, phoneNumber, input);
        return;
    }
    
    // SEGUNDO: Si la IA está habilitada, usar IA para detectar la intención
    if (isAIEnabled()) {
        try {
            const aiResponse = await processNaturalLanguage(input, {
                context: "El usuario está eligiendo qué número de teléfono usar para su cita. Opciones: usar su número actual de WhatsApp o registrar un número diferente.",
                currentState: {
                    whatsappNumber: phoneNumber.replace("@c.us", "")
                }
            });
            
            if (aiResponse && aiResponse.use_current_phone === true) {
                // Usar número actual de WhatsApp - extraer últimos 10 dígitos
                const whatsappNumber = phoneNumber.replace("@c.us", "");
                
                // Si es un número de WhatsApp (12 dígitos con código 57), extraer últimos 10
                let phoneToUse = whatsappNumber;
                if (whatsappNumber.length === 12 && whatsappNumber.startsWith('57')) {
                    phoneToUse = whatsappNumber.substring(2); // Quitar el "57" del inicio
                }
                await processPhoneNumber(message, phoneNumber, phoneToUse);
                return;
            } else if (aiResponse && aiResponse.use_current_phone === false) {
                // Solicitar número diferente
                await message.reply("Por favor, escribe el número de teléfono que quieres usar (ejemplo: 3001234567):");
                return;
            }
        } catch (error) {
            console.error(`[${phoneNumber}] Error processing with AI:`, error);
        }
    }
    
    // Fallback: verificar opciones numéricas tradicionales
    if (input === "1" || input === "use_current_phone") {
        // Usar número actual de WhatsApp - extraer últimos 10 dígitos
        const whatsappNumber = phoneNumber.replace("@c.us", "");
        let phoneToUse = whatsappNumber;
        if (whatsappNumber.length === 12 && whatsappNumber.startsWith('57')) {
            phoneToUse = whatsappNumber.substring(2); // Quitar el "57" del inicio
        }
        await processPhoneNumber(message, phoneNumber, phoneToUse);
        return;
    } else if (input === "2" || input === "register_different_phone") {
        // Solicitar número diferente
        await message.reply("Por favor, escribe el número de teléfono que quieres usar (ejemplo: 3001234567):");
        return;
    }
    
    // Si no es una opción, procesar como número de teléfono
    const phone = input.replace(/\D/g, ""); // Solo números

    // Validar longitud exacta de 10 dígitos
    if (phone.length !== 10) {
        await message.reply("❌ El número de teléfono debe tener exactamente 10 dígitos.\n\nPor favor, escribe tu número de teléfono (ejemplo: 3001234567):");
        return;
    }
    
    await processPhoneNumber(message, phoneNumber, phone);
}

// Función auxiliar para procesar el número de teléfono
async function processPhoneNumber(message, phoneNumber, phone) {
    let phoneToValidate = phone;
    
    // Si es un número de WhatsApp (12 dígitos con código de país 57), extraer solo los últimos 10 dígitos
    if (phone.length === 12 && phone.startsWith('57')) {
        phoneToValidate = phone.substring(2); // Quitar el "57" del inicio
    }
    
    // Validar longitud exacta de 10 dígitos
    if (phoneToValidate.length !== 10) {
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

    const areaCode = phoneToValidate.substring(0, 3);
    if (!validAreaCodes.includes(areaCode)) {
        await message.reply("❌ Código de área inválido. Por favor, verifica que sea un número de celular colombiano válido.\n\nEjemplo: 3001234567");
        return;
    }

    // Validar que no sea un número con dígitos repetidos (ej: 1111111111)
    if (/^(\d)\1{9}$/.test(phoneToValidate)) {
        await message.reply("❌ Número de teléfono inválido. Por favor, escribe un número válido.\n\nEjemplo: 3001234567");
        return;
    }
    
    // Usar el número original (con código de país si es de WhatsApp) para guardar
    const finalPhone = phone;

    conversationManager.updateConversationState(phoneNumber, {
        clientPhone: finalPhone
    });

    // Verificar si ya tenemos toda la información necesaria
    const conversationState = conversationManager.getConversationState(phoneNumber);
    
    if (conversationState.selectedBarber && 
        conversationState.selectedService && 
        conversationState.selectedDate && 
        conversationState.selectedTime) {
        
        // VALIDAR DISPONIBILIDAD ANTES DE PEDIR CONFIRMACIÓN
        const [day, month, year] = conversationState.selectedDate.split('/');
        const selectedDate = new Date(year, month - 1, day);
        const barberCalendarId = conversationState.selectedBarber.calendarId;
        const existingAppointments = await getExistingAppointments(calendarAuth, selectedDate, barberCalendarId);
        
        // Verificar si el horario aún está disponible
        const isTimeOccupied = existingAppointments.some(appointment => {
            const appointmentTime = extractTimeFromAppointment(appointment);
            return appointmentTime === conversationState.selectedTime;
        });
        
        if (isTimeOccupied) {
            const scheduleType = conversationState.scheduleType || 'general';
            await message.reply(`❌ Lo siento, el horario ${conversationState.selectedTime} ya no está disponible para ${conversationState.selectedBarber.name}.\n\nPor favor, selecciona otro horario disponible:\n\n${getAvailableTimeSlots(selectedDate, conversationState.selectedService.duration, existingAppointments, scheduleType).map((slot, index) => `${index + 1}. ${slot}`).join('\n')}`);
            
            // Volver al estado de selección de hora (preservar barbero, servicio y datos del cliente)
            conversationManager.updateConversationState(phoneNumber, {
                state: CONVERSATION_STATES.SELECTING_TIME,
                selectedBarber: conversationState.selectedBarber,
                selectedService: conversationState.selectedService,
                clientName: conversationState.clientName,
                clientPhone: conversationState.clientPhone
            });
            return;
        }
        
        // Si tenemos toda la información Y el horario está disponible, ir directo a confirmación
        conversationManager.updateConversationState(phoneNumber, {
            state: CONVERSATION_STATES.CONFIRMING
        });
        
        // Usar mensaje directo para confirmación (sin sugerencias)
        await message.reply(`✅ Teléfono registrado: ${finalPhone}\n\n${conversationManager.getConfirmationMessage(phoneNumber)}`);
    } else {
        // Si falta información, determinar qué falta
        let nextStep = "";
        let nextState = CONVERSATION_STATES.MENU;
        
        if (!conversationState.selectedBarber) {
            if (isAIEnabled()) {
                nextStep = "Primero, selecciona tu barbero preferido:\n\n" + getBarberMenuNatural();
            } else {
                nextStep = "Primero, selecciona tu barbero preferido:\n\n" + getBarberMenu();
            }
            nextState = CONVERSATION_STATES.SELECTING_BARBER;
        } else if (!conversationState.selectedService) {
            if (isAIEnabled()) {
                nextStep = "¿Qué servicio quieres?";
                nextState = CONVERSATION_STATES.SELECTING_SERVICE;
            } else {
                nextStep = "Ahora selecciona el servicio que deseas:\n\n" + getServiceMenu();
                nextState = CONVERSATION_STATES.SELECTING_SERVICE;
            }
        } else if (!conversationState.selectedDate) {
            nextStep = "¿Para qué fecha te gustaría agendar tu cita?\n\nPuedes decirme:\n• \"Hoy\" o \"mañana\"\n• \"El próximo martes\" o \"el viernes\"\n• \"15 de diciembre\" o \"el 20\"\n• O cualquier fecha que prefieras";
            nextState = CONVERSATION_STATES.SELECTING_DATE;
        } else if (!conversationState.selectedTime) {
            nextStep = "¿A qué hora te gustaría la cita?\n\nPuedes decirme:\n• \"A las 2\" o \"a las 3 de la tarde\"\n• \"14:30\" o \"2:30 PM\"";
            nextState = CONVERSATION_STATES.SELECTING_TIME;
            // Preservar información del barbero y servicio (usar el identificado si está disponible)
            if (!updates.selectedBarber) {
                updates.selectedBarber = conversationState.selectedBarber;
            }
            if (!updates.selectedService) {
                updates.selectedService = conversationState.selectedService;
            }
        }
        
        conversationManager.updateConversationState(phoneNumber, {
            state: nextState
        });
        
        await message.reply(`✅ Teléfono registrado: ${finalPhone}\n\n${nextStep}`);
    }
}

// Manejar reagendamiento de citas
async function handleReschedule(message, phoneNumber) {
    await message.reply(`🔄 Para reagendar tu cita, necesito encontrar tu cita actual.\n\nPor favor, proporciona tu nombre completo o número de teléfono para buscar tu cita:`);
    
    conversationManager.updateConversationState(phoneNumber, {
        state: CONVERSATION_STATES.RESCHEDULING
    });
}

// Manejar cancelación de citas
async function handleCancel(message, phoneNumber) {
    await message.reply(`❌ Para cancelar tu cita, necesito encontrar tu cita actual.\n\nPor favor, proporciona tu nombre completo o número de teléfono para buscar tu cita:`);
    
    conversationManager.updateConversationState(phoneNumber, {
        state: CONVERSATION_STATES.CANCELLING
    });
}

// Función auxiliar para validar si una cita puede ser modificada (mínimo 1 hora de anticipación)
function canModifyAppointment(appointment) {
      const now = new Date();
    const appointmentTime = new Date(appointment.start.dateTime || appointment.start.date);
    const timeDifference = appointmentTime.getTime() - now.getTime();
    const oneHourInMs = 60 * 60 * 1000; // 1 hora en milisegundos
    
    return timeDifference >= oneHourInMs;
}

// Función auxiliar para extraer datos del cliente de una cita existente
function extractClientDataFromAppointment(appointment) {
    const description = appointment.description || '';
    const summary = appointment.summary || '';
    
    // Buscar nombre en la descripción (formato: "Cliente: nombre")
    const nameMatch = description.match(/Cliente:\s*([^\n,]+)/i);
    const clientName = nameMatch ? nameMatch[1].trim() : null;
    
    // Buscar teléfono en la descripción (formato: "Teléfono: número")
    const phoneMatch = description.match(/Teléfono:\s*([^\n,]+)/i);
    const clientPhone = phoneMatch ? phoneMatch[1].trim() : null;
    
    // Buscar barbero en la descripción (formato: "Barbero: nombre")
    const barberMatch = description.match(/Barbero:\s*([^\n,]+)/i);
    const barberName = barberMatch ? barberMatch[1].trim() : null;
    
    // Buscar servicio en la descripción (formato: "Servicio: nombre")
    const serviceMatch = description.match(/Servicio:\s*([^\n,]+)/i);
    const serviceName = serviceMatch ? serviceMatch[1].trim() : null;
    
    // Si no se encuentra en la descripción, intentar extraer del resumen
    if (!clientName && summary) {
        // Buscar patrones como "Corte con barba - pancho"
        const summaryMatch = summary.match(/- ([^-]+)$/);
        if (summaryMatch) {
            return {
                name: summaryMatch[1].trim(),
                phone: clientPhone,
                barber: barberName,
                service: serviceName
            };
        }
    }
    
    return {
        name: clientName,
        phone: clientPhone,
        barber: barberName,
        service: serviceName
    };
}

// Función auxiliar para identificar barbero y servicio por nombre
function identifyBarberAndServiceFromNames(barberName, serviceName) {
    let identifiedBarber = null;
    let identifiedService = null;
    
    // Identificar barbero
    if (barberName) {
        for (const key in BARBERS) {
            const barber = BARBERS[key];
            if (barber.name.toLowerCase().includes(barberName.toLowerCase()) || 
                barberName.toLowerCase().includes(barber.name.toLowerCase())) {
                identifiedBarber = barber;
                break;
            }
        }
    }
    
    // Identificar servicio
    if (serviceName) {
        for (const key in SERVICES) {
            const service = SERVICES[key];
            if (service.name.toLowerCase().includes(serviceName.toLowerCase()) || 
                serviceName.toLowerCase().includes(service.name.toLowerCase()) ||
                service.aliases.some(alias => alias.toLowerCase().includes(serviceName.toLowerCase()))) {
                identifiedService = service;
                break;
            }
        }
    }
    
    return {
        barber: identifiedBarber,
        service: identifiedService
    };
}

// Manejar entrada para reagendamiento
async function handleRescheduleInput(message, phoneNumber, text) {
    const input = text.trim();
    const conversationState = conversationManager.getConversationState(phoneNumber);
    
    // Verificar si es una selección numérica de una lista previa
    if (conversationState.foundAppointments && /^\d+$/.test(input)) {
        const selectedIndex = parseInt(input) - 1;
        const appointments = conversationState.foundAppointments;
        
        if (selectedIndex >= 0 && selectedIndex < appointments.length) {
            const selectedAppointment = appointments[selectedIndex];
            const startDate = new Date(selectedAppointment.start.dateTime || selectedAppointment.start.date);
            
            // Validar si la cita puede ser modificada (mínimo 1 hora de anticipación)
            if (!canModifyAppointment(selectedAppointment)) {
                const timeUntilAppointment = Math.ceil((startDate.getTime() - new Date().getTime()) / (1000 * 60));
                await message.reply(`❌ No puedes reagendar esta cita.\n\n📅 Cita: ${selectedAppointment.summary}\n🕐 Fecha: ${startDate.toLocaleDateString('es-CO')} ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n⏰ Tiempo restante: ${timeUntilAppointment} minutos\n\n⚠️ Las citas solo pueden ser reagendadas con un mínimo de 1 hora de anticipación.`);
                return;
            }
            
            // Extraer datos del cliente de la cita original
            const clientData = extractClientDataFromAppointment(selectedAppointment);
            
            // Identificar barbero y servicio
            const identified = identifyBarberAndServiceFromNames(clientData.barber, clientData.service);
            
            await message.reply(`📅 Cita seleccionada:\n\n👤 Cliente: ${selectedAppointment.summary}\n📅 Fecha: ${startDate.toLocaleDateString('es-CO')}\n🕐 Hora: ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n\n¿Para qué nueva fecha y hora te gustaría reagendar esta cita?`);
            
            // Guardar la cita seleccionada y todos los datos para el reagendamiento
            conversationManager.updateConversationState(phoneNumber, {
                currentAppointment: selectedAppointment,
                foundAppointments: null, // Limpiar la lista
                clientName: clientData.name,
                clientPhone: clientData.phone,
                selectedBarber: identified.barber,
                selectedService: identified.service,
                state: CONVERSATION_STATES.SELECTING_DATE
            });
            return;
        } else {
            await message.reply(`❌ Opción no válida. Por favor, selecciona un número del 1 al ${appointments.length}.`);
            return;
        }
    }
    
    // Buscar citas por nombre o teléfono
    const appointments = await findAppointmentsByClient(calendarAuth, input, input);
    
    if (appointments.length === 0) {
        await message.reply(`❌ No encontré ninguna cita con "${input}".\n\nPor favor, verifica tu nombre o número de teléfono y vuelve a intentar.`);
        return;
    }
    
    if (appointments.length === 1) {
        const appointment = appointments[0];
        const startDate = new Date(appointment.start.dateTime || appointment.start.date);
        const endDate = new Date(appointment.end.dateTime || appointment.end.date);
        
        // Validar si la cita puede ser modificada (mínimo 1 hora de anticipación)
        if (!canModifyAppointment(appointment)) {
            const timeUntilAppointment = Math.ceil((startDate.getTime() - new Date().getTime()) / (1000 * 60));
            await message.reply(`❌ No puedes reagendar esta cita.\n\n📅 Cita: ${appointment.summary}\n🕐 Fecha: ${startDate.toLocaleDateString('es-CO')} ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n⏰ Tiempo restante: ${timeUntilAppointment} minutos\n\n⚠️ Las citas solo pueden ser reagendadas con un mínimo de 1 hora de anticipación.`);
            return;
        }
        
        // Extraer datos del cliente de la cita original
        const clientData = extractClientDataFromAppointment(appointment);
        
        // Identificar barbero y servicio
        const identified = identifyBarberAndServiceFromNames(clientData.barber, clientData.service);
        
        await message.reply(`📅 Cita encontrada:\n\n👤 Cliente: ${appointment.summary}\n📅 Fecha: ${startDate.toLocaleDateString('es-CO')}\n🕐 Hora: ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n\n¿Para qué nueva fecha y hora te gustaría reagendar esta cita?`);
        
        // Guardar la cita actual y todos los datos para el reagendamiento
        conversationManager.updateConversationState(phoneNumber, {
            currentAppointment: appointment,
            clientName: clientData.name,
            clientPhone: clientData.phone,
            selectedBarber: identified.barber,
            selectedService: identified.service,
            state: CONVERSATION_STATES.SELECTING_DATE
        });
    } else {
        // Múltiples citas encontradas - filtrar solo las que pueden ser modificadas
        const modifiableAppointments = appointments.filter(canModifyAppointment);
        
        if (modifiableAppointments.length === 0) {
            await message.reply(`❌ No tienes citas que puedan ser reagendadas.\n\n⚠️ Las citas solo pueden ser reagendadas con un mínimo de 1 hora de anticipación.`);
            return;
        }
        
        if (modifiableAppointments.length === 1) {
            // Si solo queda una cita modificable, proceder directamente
            const appointment = modifiableAppointments[0];
            const startDate = new Date(appointment.start.dateTime || appointment.start.date);
            
            // Extraer datos del cliente de la cita original
            const clientData = extractClientDataFromAppointment(appointment);
            
            // Identificar barbero y servicio
            const identified = identifyBarberAndServiceFromNames(clientData.barber, clientData.service);
            
            await message.reply(`📅 Cita encontrada:\n\n👤 Cliente: ${appointment.summary}\n📅 Fecha: ${startDate.toLocaleDateString('es-CO')}\n🕐 Hora: ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n\n¿Para qué nueva fecha y hora te gustaría reagendar esta cita?`);
            
            conversationManager.updateConversationState(phoneNumber, {
                currentAppointment: appointment,
                clientName: clientData.name,
                clientPhone: clientData.phone,
                selectedBarber: identified.barber,
                selectedService: identified.service,
                state: CONVERSATION_STATES.SELECTING_DATE
            });
        } else {
            // Múltiples citas modificables
            let response = `📅 Encontré ${modifiableAppointments.length} citas que pueden ser reagendadas:\n\n`;
            modifiableAppointments.forEach((appointment, index) => {
                const startDate = new Date(appointment.start.dateTime || appointment.start.date);
                response += `${index + 1}. ${appointment.summary} - ${startDate.toLocaleDateString('es-CO')} ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n`;
            });
            response += `\n¿Cuál cita quieres reagendar? Responde con el número (1, 2, 3, etc.)`;
            
            await message.reply(response);
            
            conversationManager.updateConversationState(phoneNumber, {
                foundAppointments: modifiableAppointments,
                state: CONVERSATION_STATES.RESCHEDULING
            });
        }
    }
}

// Manejar entrada para cancelación
async function handleCancelInput(message, phoneNumber, text) {
    const input = text.trim();
    const conversationState = conversationManager.getConversationState(phoneNumber);
    
    // Verificar si es una selección numérica de una lista previa
    if (conversationState.foundAppointments && /^\d+$/.test(input)) {
        const selectedIndex = parseInt(input) - 1;
        const appointments = conversationState.foundAppointments;
        
        if (selectedIndex >= 0 && selectedIndex < appointments.length) {
            const selectedAppointment = appointments[selectedIndex];
            const startDate = new Date(selectedAppointment.start.dateTime || selectedAppointment.start.date);
            
            // Validar si la cita puede ser cancelada (mínimo 1 hora de anticipación)
            if (!canModifyAppointment(selectedAppointment)) {
                const timeUntilAppointment = Math.ceil((startDate.getTime() - new Date().getTime()) / (1000 * 60));
                await message.reply(`❌ No puedes cancelar esta cita.\n\n📅 Cita: ${selectedAppointment.summary}\n🕐 Fecha: ${startDate.toLocaleDateString('es-CO')} ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n⏰ Tiempo restante: ${timeUntilAppointment} minutos\n\n⚠️ Las citas solo pueden ser canceladas con un mínimo de 1 hora de anticipación.`);
                return;
            }
            
            await message.reply(`📅 Cita seleccionada:\n\n👤 Cliente: ${selectedAppointment.summary}\n📅 Fecha: ${startDate.toLocaleDateString('es-CO')}\n🕐 Hora: ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n\n¿Estás seguro de que quieres cancelar esta cita? Responde "SÍ" para confirmar o "NO" para cancelar.`);
            
            // Guardar la cita seleccionada para la cancelación
            conversationManager.updateConversationState(phoneNumber, {
                currentAppointment: selectedAppointment,
                foundAppointments: null, // Limpiar la lista
                state: CONVERSATION_STATES.CONFIRMING
            });
            return;
        } else {
            await message.reply(`❌ Opción no válida. Por favor, selecciona un número del 1 al ${appointments.length}.`);
            return;
        }
    }
    
    // Buscar citas por nombre o teléfono
    const appointments = await findAppointmentsByClient(calendarAuth, input, input);
    
    if (appointments.length === 0) {
        await message.reply(`❌ No encontré ninguna cita con "${input}".\n\nPor favor, verifica tu nombre o número de teléfono y vuelve a intentar.`);
        return;
    }
    
    if (appointments.length === 1) {
        const appointment = appointments[0];
        const startDate = new Date(appointment.start.dateTime || appointment.start.date);
        const endDate = new Date(appointment.end.dateTime || appointment.end.date);
        
        // Validar si la cita puede ser cancelada (mínimo 1 hora de anticipación)
        if (!canModifyAppointment(appointment)) {
            const timeUntilAppointment = Math.ceil((startDate.getTime() - new Date().getTime()) / (1000 * 60));
            await message.reply(`❌ No puedes cancelar esta cita.\n\n📅 Cita: ${appointment.summary}\n🕐 Fecha: ${startDate.toLocaleDateString('es-CO')} ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n⏰ Tiempo restante: ${timeUntilAppointment} minutos\n\n⚠️ Las citas solo pueden ser canceladas con un mínimo de 1 hora de anticipación.`);
            return;
        }
        
        await message.reply(`📅 Cita encontrada:\n\n👤 Cliente: ${appointment.summary}\n📅 Fecha: ${startDate.toLocaleDateString('es-CO')}\n🕐 Hora: ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n\n¿Estás seguro de que quieres cancelar esta cita? Responde "SÍ" para confirmar o "NO" para cancelar.`);
        
        // Guardar la cita para cancelación
        conversationManager.updateConversationState(phoneNumber, {
            currentAppointment: appointment,
            state: CONVERSATION_STATES.CONFIRMING
        });
    } else {
        // Múltiples citas encontradas - filtrar solo las que pueden ser canceladas
        const modifiableAppointments = appointments.filter(canModifyAppointment);
        
        if (modifiableAppointments.length === 0) {
            await message.reply(`❌ No tienes citas que puedan ser canceladas.\n\n⚠️ Las citas solo pueden ser canceladas con un mínimo de 1 hora de anticipación.`);
            return;
        }
        
        if (modifiableAppointments.length === 1) {
            // Si solo queda una cita modificable, proceder directamente
            const appointment = modifiableAppointments[0];
            const startDate = new Date(appointment.start.dateTime || appointment.start.date);
            
            await message.reply(`📅 Cita encontrada:\n\n👤 Cliente: ${appointment.summary}\n📅 Fecha: ${startDate.toLocaleDateString('es-CO')}\n🕐 Hora: ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n\n¿Estás seguro de que quieres cancelar esta cita? Responde "SÍ" para confirmar o "NO" para cancelar.`);
            
            conversationManager.updateConversationState(phoneNumber, {
                currentAppointment: appointment,
                state: CONVERSATION_STATES.CONFIRMING
            });
        } else {
            // Múltiples citas modificables
            let response = `📅 Encontré ${modifiableAppointments.length} citas que pueden ser canceladas:\n\n`;
            modifiableAppointments.forEach((appointment, index) => {
                const startDate = new Date(appointment.start.dateTime || appointment.start.date);
                response += `${index + 1}. ${appointment.summary} - ${startDate.toLocaleDateString('es-CO')} ${startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n`;
            });
            response += `\n¿Cuál cita quieres cancelar? Responde con el número (1, 2, 3, etc.)`;
            
            await message.reply(response);
            
            conversationManager.updateConversationState(phoneNumber, {
                foundAppointments: modifiableAppointments,
                state: CONVERSATION_STATES.CANCELLING
            });
        }
    }
}

// Manejar selección de fecha
async function handleDateSelection(message, phoneNumber, text) {
    const dateInput = text.trim();

    // Intentar procesar fecha Y hora natural primero
    let naturalDateTime = parseNaturalDateAndTime(dateInput);
    if (naturalDateTime.date) {
        console.log(`🤖 Fecha y hora natural procesada: "${dateInput}" -> fecha: "${naturalDateTime.date}", hora: "${naturalDateTime.time}"`);
        
        // Actualizar estado con fecha
        conversationManager.updateConversationState(phoneNumber, {
            selectedDate: naturalDateTime.date
        });
        
        // Si también tenemos hora, actualizarla
        if (naturalDateTime.time) {
            conversationManager.updateConversationState(phoneNumber, {
                selectedTime: naturalDateTime.time
            });
            
            // VALIDACIÓN: Verificar si es horario extra y mostrar advertencia INMEDIATAMENTE
            if (isExtraScheduleTime(naturalDateTime.time)) {
                console.log(`🔍 [${phoneNumber}] handleDateSelection - Detectado horario extra: ${naturalDateTime.time}`);
                
                await message.reply(`⚠️ ADVERTENCIA: Has seleccionado un horario extra (${naturalDateTime.time}).\n\n🌙 Este horario tiene un precio doble (el doble del precio normal del servicio).\n\n¿Confirmas que quieres continuar con este horario extra?`);
                
                // Actualizar el tipo de horario a extra
                conversationManager.updateConversationState(phoneNumber, {
                    scheduleType: 'extra'
                });
                return;
            }
        }
        
        await processSelectedDate(message, phoneNumber, naturalDateTime.date);
        return;
    }

    // Fallback: intentar solo fecha natural
    let naturalDate = parseNaturalDate(dateInput);
    if (naturalDate) {
        console.log(`🤖 Solo fecha natural procesada: "${dateInput}" -> "${naturalDate}"`);
        await processSelectedDate(message, phoneNumber, naturalDate);
        return;
    }

    // Si no se pudo procesar con parseNaturalDate, intentar con IA
    if (isAIEnabled()) {
        console.log(`🤖 Intentando procesar con IA: "${dateInput}"`);
        const aiResponse = await processNaturalLanguage(dateInput, conversationManager.getConversationState(phoneNumber));
        
        // DEBUG: Log completo de la respuesta de IA
        
        if (aiResponse && isAIResponseReliable(aiResponse) && aiResponse.date) {
            console.log(`🤖 IA procesó fecha: "${dateInput}" -> "${aiResponse.date}"`);
            
            // Si también tenemos hora, procesarla
            if (aiResponse.time) {
                console.log(`🤖 IA también procesó hora: "${aiResponse.time}"`);
                // Actualizar estado con fecha y hora
                conversationManager.updateConversationState(phoneNumber, {
                    selectedDate: aiResponse.date,
                    selectedTime: aiResponse.time
                });
                
                // Verificar si ya tenemos toda la información necesaria
                const conversationState = conversationManager.getConversationState(phoneNumber);
                if (conversationState.selectedBarber && 
                    conversationState.selectedService && 
                    conversationState.selectedDate && 
                    conversationState.selectedTime &&
                    conversationState.clientName &&
                    conversationState.clientPhone) {
                    
                    // VALIDAR DISPONIBILIDAD ANTES DE PEDIR CONFIRMACIÓN
                    const [day, month, year] = conversationState.selectedDate.split('/');
                    const selectedDate = new Date(year, month - 1, day);
                    const barberCalendarId = conversationState.selectedBarber.calendarId;
                    const existingAppointments = await getExistingAppointments(calendarAuth, selectedDate, barberCalendarId);
                    
                    // Verificar si el horario aún está disponible
                    const isTimeOccupied = existingAppointments.some(appointment => {
                        const appointmentTime = extractTimeFromAppointment(appointment);
                        return appointmentTime === conversationState.selectedTime;
                    });
                    
                    if (isTimeOccupied) {
                        const scheduleType = conversationState.scheduleType || 'general';
            await message.reply(`❌ Lo siento, el horario ${conversationState.selectedTime} ya no está disponible para ${conversationState.selectedBarber.name}.\n\nPor favor, selecciona otro horario disponible:\n\n${getAvailableTimeSlots(selectedDate, conversationState.selectedService.duration, existingAppointments, scheduleType).map((slot, index) => `${index + 1}. ${slot}`).join('\n')}`);
                        
                        // Volver al estado de selección de hora
                        conversationManager.updateConversationState(phoneNumber, {
                            state: CONVERSATION_STATES.SELECTING_TIME
                        });
                        return;
                    }
                    
                    // Si tenemos toda la información Y el horario está disponible, ir directo a confirmación
                    conversationManager.updateConversationState(phoneNumber, {
                        state: CONVERSATION_STATES.CONFIRMING
                    });
                    
                    // Usar mensaje directo para confirmación (sin sugerencias)
                    await message.reply(`✅ Fecha y hora seleccionadas: ${aiResponse.date} a las ${aiResponse.time}\n\n${conversationManager.getConfirmationMessage(phoneNumber)}`);
                    return;
                } else {
                    // Si falta información, procesar normalmente
                    await processSelectedDate(message, phoneNumber, aiResponse.date);
                    return;
                }
            } else {
                // Solo tenemos fecha, procesar normalmente
                await processSelectedDate(message, phoneNumber, aiResponse.date);
                return;
            }
        }
    }

    // Aceptar tanto guiones como barras
    let dateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    let match = dateInput.match(dateRegex);

    if (!match) {
        await message.reply("❌ Formato de fecha inválido. Por favor, usa el formato DD/MM/AAAA o DD-MM-AAAA\nEjemplo: 15/12/2024 o 15-12-2024\n\nTambién puedes escribir:\n• 'hoy'\n• 'mañana'\n• 'pasado mañana'\n• 'el próximo miércoles'\n• 'el viernes'");
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

    await processSelectedDate(message, phoneNumber, dateInput);
}

// Función auxiliar para procesar fecha seleccionada
async function processSelectedDate(message, phoneNumber, dateInput) {
    
    const [, day, month, year] = dateInput.split('/');
    const selectedDate = new Date(year, month - 1, day);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        await message.reply("❌ No puedes agendar citas para fechas pasadas. Por favor, selecciona una fecha futura:");
        return;
    }

    conversationManager.updateConversationState(phoneNumber, {
        selectedDate: dateInput
    });

    // Verificar si ya tenemos toda la información necesaria
    const conversationState = conversationManager.getConversationState(phoneNumber);
    
    if (conversationState.selectedBarber && 
        conversationState.selectedService && 
        conversationState.selectedDate && 
        conversationState.selectedTime &&
        conversationState.clientName &&
        conversationState.clientPhone) {
        
        // VALIDACIÓN: Verificar si es horario extra y mostrar advertencia
        if (isExtraScheduleTime(conversationState.selectedTime) && conversationState.scheduleType !== 'extra') {
            console.log(`🔍 [${phoneNumber}] processSelectedDate - Detectado horario extra: ${conversationState.selectedTime}`);
            const service = conversationState.selectedService;
            const extraPrice = service.price * 2;
            
            await message.reply(`⚠️ ADVERTENCIA: Has seleccionado un horario extra (${conversationState.selectedTime}).\n\n🌙 Este horario tiene un precio doble:\n💰 Precio normal: $${service.price.toLocaleString()} COP\n💰 Precio extra: $${extraPrice.toLocaleString()} COP\n\n¿Confirmas que quieres continuar con este horario extra?`);
            
            // Actualizar el tipo de horario a extra
            conversationManager.updateConversationState(phoneNumber, {
                scheduleType: 'extra'
            });
            return;
        }
        
        // VALIDAR DISPONIBILIDAD ANTES DE PEDIR CONFIRMACIÓN
        const [day, month, year] = conversationState.selectedDate.split('/');
        const selectedDate = new Date(year, month - 1, day);
        const barberCalendarId = conversationState.selectedBarber.calendarId;
        const existingAppointments = await getExistingAppointments(calendarAuth, selectedDate, barberCalendarId);
        
        // Verificar si el horario aún está disponible
        const isTimeOccupied = existingAppointments.some(appointment => {
            const appointmentTime = extractTimeFromAppointment(appointment);
            return appointmentTime === conversationState.selectedTime;
        });
        
        if (isTimeOccupied) {
            const scheduleType = conversationState.scheduleType || 'general';
            await message.reply(`❌ Lo siento, el horario ${conversationState.selectedTime} ya no está disponible para ${conversationState.selectedBarber.name}.\n\nPor favor, selecciona otro horario disponible:\n\n${getAvailableTimeSlots(selectedDate, conversationState.selectedService.duration, existingAppointments, scheduleType).map((slot, index) => `${index + 1}. ${slot}`).join('\n')}`);
            
            // Volver al estado de selección de hora (preservar barbero, servicio y datos del cliente)
            conversationManager.updateConversationState(phoneNumber, {
                state: CONVERSATION_STATES.SELECTING_TIME,
                selectedBarber: conversationState.selectedBarber,
                selectedService: conversationState.selectedService,
                clientName: conversationState.clientName,
                clientPhone: conversationState.clientPhone
            });
            return;
        }
        
        // Si tenemos toda la información Y el horario está disponible, ir directo a confirmación
        conversationManager.updateConversationState(phoneNumber, {
            state: CONVERSATION_STATES.CONFIRMING
        });
        
        // Usar mensaje directo para confirmación (sin sugerencias)
        await message.reply(`✅ Fecha seleccionada: ${dateInput}\n\n${conversationManager.getConfirmationMessage(phoneNumber)}`);
        return;
    }

    // Si no tenemos hora, pedirla
    if (!conversationState.selectedTime) {
        conversationManager.updateConversationState(phoneNumber, {
            state: CONVERSATION_STATES.SELECTING_TIME
        });

        // Obtener citas existentes para esta fecha del barbero seleccionado
        const barberCalendarId = conversationState.selectedBarber.calendarId;
        let existingAppointments;
        try {
            existingAppointments = await getExistingAppointments(calendarAuth, selectedDate, barberCalendarId);
            console.log(`📅 Citas existentes para ${dateInput} en ${barberCalendarId}:`, existingAppointments.length);
        } catch (error) {
            console.error(`❌ [${phoneNumber}] Error al obtener citas existentes:`, error.message);
            
            // Manejar error de autenticación
            if (error.message && error.message.includes('Token expirado')) {
                await message.reply(`❌ Error de autenticación con Google Calendar. Por favor, contacta al administrador para re-autorizar la aplicación.\n\nEl token de acceso ha expirado y necesita ser renovado.`);
                return;
            }
            
            // Para otros errores, usar array vacío
            existingAppointments = [];
            console.log(`⚠️ [${phoneNumber}] Usando array vacío debido a error en getExistingAppointments`);
        }

        const scheduleType = conversationManager.getConversationState(phoneNumber).scheduleType || 'general';
        const timeSlots = getAvailableTimeSlots(selectedDate, conversationManager.getConversationState(phoneNumber).selectedService.duration, existingAppointments, scheduleType);

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

        // Usar lenguaje natural si la IA está habilitada, sino usar lista tradicional
        if (isAIEnabled()) {
            const timeText = `✅ Fecha seleccionada: ${dateInput}\n\n¿A qué hora quieres tu cita?`;
            const suggestions = timeSlots.slice(0, 5).map(slot => `A las ${slot}`);
            await sendMessageWithNaturalLanguage(message, timeText, suggestions);
        } else {
            await message.reply(`✅ Fecha seleccionada: ${dateInput}\n\nSelecciona un horario disponible:\n\n${timeOptions}\nResponde con el número de la opción que prefieras:`);
        }
    } else {
        // Si ya tenemos hora, verificar qué falta
        let nextStep = "";
        let nextState = CONVERSATION_STATES.MENU;
        
        if (!conversationState.clientName) {
            nextStep = "Por favor, escribe tu nombre completo:";
            nextState = CONVERSATION_STATES.COLLECTING_NAME;
        } else if (!conversationState.clientPhone) {
            nextStep = "Ahora por favor, escribe tu número de teléfono (ejemplo: 3001234567):";
            nextState = CONVERSATION_STATES.COLLECTING_PHONE;
        }
        
        conversationManager.updateConversationState(phoneNumber, {
            state: nextState
        });
        
        await message.reply(`✅ Fecha seleccionada: ${dateInput}\n\n${nextStep}`);
    }
}

// Manejar selección de tipo de horario
async function handleScheduleTypeSelection(message, phoneNumber, text) {
    const conversationState = conversationManager.getConversationState(phoneNumber);
    
    // Si la IA está habilitada, usar IA para detectar la intención
    if (isAIEnabled()) {
        try {
            const aiResponse = await processNaturalLanguage(text, conversationState);
            console.log(`🤖 handleScheduleTypeSelection - Respuesta IA:`, aiResponse);
            
            if (aiResponse && aiResponse.scheduleType) {
                const scheduleType = aiResponse.scheduleType.toLowerCase();
                if (scheduleType === 'extra' || scheduleType === 'especial') {
                    conversationManager.updateConversationState(phoneNumber, {
                        scheduleType: 'extra',
                        state: CONVERSATION_STATES.SELECTING_DATE
                    });
                    
                    await message.reply(`🌙 Perfecto! Has seleccionado el horario extra (7:00 AM - 10:00 PM).\n\n⚠️ Recuerda que este horario tiene un precio doble.\n\n¿Para qué fecha te gustaría agendar tu cita?`);
                    return;
                } else if (scheduleType === 'general' || scheduleType === 'normal') {
                    conversationManager.updateConversationState(phoneNumber, {
                        scheduleType: 'general',
                        state: CONVERSATION_STATES.SELECTING_DATE
                    });
                    
                    await message.reply(`✅ Perfecto! ¿Para qué fecha te gustaría agendar tu cita?`);
                    return;
                }
            }
        } catch (error) {
            console.error(`❌ Error procesando tipo de horario con IA:`, error);
        }
    }
    
    // Fallback: verificar opciones directas
    const input = text.trim().toLowerCase();
    
    if (input === 'extra' || input === 'especial' || input === '2') {
        conversationManager.updateConversationState(phoneNumber, {
            scheduleType: 'extra',
            state: CONVERSATION_STATES.SELECTING_DATE
        });
        
        await message.reply(`🌙 Perfecto! Has seleccionado el horario extra (7:00 AM - 10:00 PM).\n\n⚠️ Recuerda que este horario tiene un precio doble.\n\n¿Para qué fecha te gustaría agendar tu cita?`);
    } else if (input === 'general' || input === 'normal' || input === '1') {
        conversationManager.updateConversationState(phoneNumber, {
            scheduleType: 'general',
            state: CONVERSATION_STATES.SELECTING_DATE
        });
        
        await message.reply(`✅ Perfecto! ¿Para qué fecha te gustaría agendar tu cita?`);
    } else {
        await message.reply(`❌ No entendí tu selección. Por favor, elige una opción:\n\n${getScheduleTypeMenuNatural()}`);
    }
}

// Manejar selección de hora
async function handleTimeSelection(message, phoneNumber, text) {
    const conversationState = conversationManager.getConversationState(phoneNumber);
    
    // Validar que tenemos barbero y servicio seleccionados
    if (!conversationState.selectedBarber) {
        console.error(`❌ [${phoneNumber}] No hay barbero seleccionado en handleTimeSelection`);
        await message.reply("❌ Error: No hay barbero seleccionado. Por favor, reinicia la conversación escribiendo 'hola'.");
        return;
    }
    
    if (!conversationState.selectedService) {
        console.error(`❌ [${phoneNumber}] No hay servicio seleccionado en handleTimeSelection`);
        await message.reply("❌ Error: No hay servicio seleccionado. Por favor, reinicia la conversación escribiendo 'hola'.");
        return;
    }
    
    if (!conversationState.selectedDate) {
        console.error(`❌ [${phoneNumber}] No hay fecha seleccionada en handleTimeSelection`);
        await message.reply("❌ Error: No hay fecha seleccionada. Por favor, reinicia la conversación escribiendo 'hola'.");
        return;
    }
    
    // VALIDACIÓN: Verificar que no esté en horario de descanso (para horarios naturales)
    if (text.includes(':') || text.includes('las') || text.includes('a las')) {
        // Es un formato de hora, verificar si está en horario de descanso
        let naturalTime = parseNaturalTime(text);
        if (naturalTime && conflictsWithBreakTime(naturalTime, conversationState.selectedService.duration)) {
            await message.reply(`❌ Lo siento, no se pueden agendar citas durante el horario de almuerzo (1:00 PM - 2:00 PM).\n\nPor favor, selecciona otro horario disponible.`);
            
            // Mostrar horarios disponibles
            const [day, month, year] = conversationState.selectedDate.split('/');
            const selectedDate = new Date(year, month - 1, day);
            const barberCalendarId = conversationState.selectedBarber.calendarId;
            const existingAppointments = await getExistingAppointments(calendarAuth, selectedDate, barberCalendarId);
            const scheduleType = conversationState.scheduleType || 'general';
            const timeSlots = getAvailableTimeSlots(selectedDate, conversationState.selectedService.duration, existingAppointments, scheduleType);
            
            await message.reply(`🕐 Horarios disponibles:\n\n${timeSlots.map((slot, index) => `${index + 1}. ${slot}`).join('\n')}\n\n¿A qué hora te gustaría la cita?`);
            return;
        }
    }
    
    // Convertir la fecha string a objeto Date
    const [day, month, year] = conversationState.selectedDate.split('/');
    const selectedDate = new Date(year, month - 1, day);

    // Obtener citas existentes para esta fecha del barbero seleccionado
    const barberCalendarId = conversationState.selectedBarber.calendarId;
    const existingAppointments = await getExistingAppointments(calendarAuth, selectedDate, barberCalendarId);
    const scheduleType = conversationState.scheduleType || 'general';
    const timeSlots = getAvailableTimeSlots(selectedDate, conversationState.selectedService.duration, existingAppointments, scheduleType);
    
    // VALIDACIÓN: Verificar si es horario extra y mostrar advertencia
    let selectedTime = null;
    if (text.includes(':') || text.includes('las') || text.includes('a las')) {
        selectedTime = parseNaturalTime(text);
    } else {
        // Si es una selección numérica, obtener el horario correspondiente
        const timeIndex = parseInt(text) - 1;
        if (timeIndex >= 0 && timeIndex < timeSlots.length) {
            selectedTime = timeSlots[timeIndex];
        }
    }
    
    if (selectedTime && isExtraScheduleTime(selectedTime) && conversationState.scheduleType !== 'extra') {
        console.log(`🔍 [${phoneNumber}] Detectado horario extra: ${selectedTime}`);
        const service = conversationState.selectedService;
        const extraPrice = service.price * 2;
        
        await message.reply(`⚠️ ADVERTENCIA: Has seleccionado un horario extra (${selectedTime}).\n\n🌙 Este horario tiene un precio doble:\n💰 Precio normal: $${service.price.toLocaleString()} COP\n💰 Precio extra: $${extraPrice.toLocaleString()} COP\n\n¿Confirmas que quieres continuar con este horario extra?`);
        
        // Actualizar el tipo de horario a extra
        conversationManager.updateConversationState(phoneNumber, {
            scheduleType: 'extra'
        });
        return;
    }

    // PRIMERO: Verificar si es un formato de hora (contiene :)
    if (text.includes(':')) {
        // Es un formato de hora, procesar como hora natural
        let naturalTime = parseNaturalTime(text);
        if (naturalTime) {
            console.log(`🤖 Hora natural procesada: "${text}" -> "${naturalTime}"`);
            
            // Validar que la hora natural esté disponible
            const isTimeOccupied = existingAppointments.some(appointment => {
                const appointmentTime = extractTimeFromAppointment(appointment);
                return appointmentTime === naturalTime;
            });
            
            if (isTimeOccupied) {
                await message.reply(`❌ Lo siento, el horario ${naturalTime} ya está ocupado para ${conversationState.selectedBarber.name}.\n\nPor favor, selecciona otro horario disponible:\n\n${timeSlots.map((slot, index) => `${index + 1}. ${slot}`).join('\n')}`);
                return;
            }
            
            await processSelectedTime(message, phoneNumber, naturalTime);
            return;
        }
    }

    // SEGUNDO: Procesar con IA si está habilitada (para horarios naturales como "a las 2")
    if (isAIEnabled()) {
        try {
            const aiResponse = await processNaturalLanguage(text, conversationState);
            console.log(`🤖 handleTimeSelection - Respuesta IA:`, aiResponse);
            
            if (aiResponse && aiResponse.time) {
                const naturalTime = aiResponse.time;
                console.log(`🤖 handleTimeSelection - Hora procesada por IA: "${text}" -> "${naturalTime}"`);
                
                // Validar que la hora esté disponible
                const isTimeOccupied = existingAppointments.some(appointment => {
                    const appointmentTime = extractTimeFromAppointment(appointment);
                    return appointmentTime === naturalTime;
                });
                
                if (isTimeOccupied) {
                    if (isAIEnabled()) {
                        await message.reply(`❌ Lo siento, el horario ${naturalTime} ya está ocupado para ${conversationState.selectedBarber.name}.\n\n${getTimeSlotsNatural(timeSlots)}`);
                    } else {
                        await message.reply(`❌ Lo siento, el horario ${naturalTime} ya está ocupado para ${conversationState.selectedBarber.name}.\n\nPor favor, selecciona otro horario disponible:\n\n${timeSlots.map((slot, index) => `${index + 1}. ${slot}`).join('\n')}`);
                    }
                    return;
                }
                
                await processSelectedTime(message, phoneNumber, naturalTime);
                return;
            }
        } catch (error) {
            console.error(`❌ Error procesando hora con IA:`, error);
        }
    }

    // TERCERO: Verificar si es una selección numérica de la lista (solo si IA NO está habilitada)
    if (!(isAIEnabled())) {
        const timeOption = parseInt(text.trim());
        if (!isNaN(timeOption) && timeOption >= 1 && timeOption <= timeSlots.length) {
            console.log(`🔍 handleTimeSelection - Selección numérica: ${timeOption} de ${timeSlots.length} opciones`);
            const selectedTime = timeSlots[timeOption - 1];
            console.log(`🔍 handleTimeSelection - Horario seleccionado: ${selectedTime}`);
            await processSelectedTime(message, phoneNumber, selectedTime);
            return;
        }
    }

    // CUARTO: Verificar si es un botón de horario (time_slot_1, time_slot_2, etc.)
    if (text.startsWith('time_slot_')) {
        const slotIndex = parseInt(text.replace('time_slot_', '')) - 1;
        if (slotIndex >= 0 && slotIndex < timeSlots.length) {
            const selectedTime = timeSlots[slotIndex];
            await processSelectedTime(message, phoneNumber, selectedTime);
            return;
        }
    }

    // CUARTO: Intentar procesar hora natural
    let naturalTime = parseNaturalTime(text);
    if (naturalTime) {
        console.log(`🤖 Hora natural procesada: "${text}" -> "${naturalTime}"`);
        
        // Validar que la hora natural esté disponible
        const isTimeOccupied = existingAppointments.some(appointment => {
            const appointmentTime = extractTimeFromAppointment(appointment);
            return appointmentTime === naturalTime;
        });
        
        if (isTimeOccupied) {
            if (isAIEnabled()) {
                await message.reply(`❌ Lo siento, el horario ${naturalTime} ya está ocupado para ${conversationState.selectedBarber.name}.\n\n${getTimeSlotsNatural(timeSlots)}`);
            } else {
                await message.reply(`❌ Lo siento, el horario ${naturalTime} ya está ocupado para ${conversationState.selectedBarber.name}.\n\nPor favor, selecciona otro horario disponible:\n\n${timeSlots.map((slot, index) => `${index + 1}. ${slot}`).join('\n')}`);
            }
            return;
        }
        
        await processSelectedTime(message, phoneNumber, naturalTime);
        return;
    }

    // Si no es una opción válida
    await message.reply("❌ Opción de horario inválida. Por favor, selecciona un número válido.\n\n💡 También puedes escribir la hora directamente:\n• '3 de la tarde'\n• '10 de la mañana'\n• '14:30'\n\nSi quieres empezar de nuevo, escribe 'hola' o 'menu'.");
}

// Función auxiliar para extraer hora de eventos de Google Calendar
function extractTimeFromAppointment(appointment) {
    if (!appointment.startTime) return null;
    
    // Manejar formato de Google Calendar (ISO 8601)
    if (appointment.startTime.includes('T')) {
        // Formato ISO: "2025-10-20T13:00:00-05:00"
        const timePart = appointment.startTime.split('T')[1];
        return timePart.split(':')[0] + ':' + timePart.split(':')[1]; // "13:00"
    } else {
        // Formato simple: "13:00"
        return appointment.startTime.split(' ')[0];
    }
}

// Función auxiliar para procesar hora seleccionada
async function processSelectedTime(message, phoneNumber, selectedTime) {
    const conversationState = conversationManager.getConversationState(phoneNumber);
    
    // VALIDACIÓN: Verificar que no esté en horario de descanso
    if (conflictsWithBreakTime(selectedTime, conversationState.selectedService.duration)) {
        await message.reply(`❌ Lo siento, no se pueden agendar citas durante el horario de almuerzo (1:00 PM - 2:00 PM).\n\nPor favor, selecciona otro horario disponible.`);
        
        // Mostrar horarios disponibles
        const [day, month, year] = conversationState.selectedDate.split('/');
        const selectedDate = new Date(year, month - 1, day);
        const barberCalendarId = conversationState.selectedBarber.calendarId;
        const existingAppointments = await getExistingAppointments(calendarAuth, selectedDate, barberCalendarId);
        const scheduleType = conversationState.scheduleType || 'general';
        const timeSlots = getAvailableTimeSlots(selectedDate, conversationState.selectedService.duration, existingAppointments, scheduleType);
        
        await message.reply(`🕐 Horarios disponibles:\n\n${timeSlots.map((slot, index) => `${index + 1}. ${slot}`).join('\n')}\n\n¿A qué hora te gustaría la cita?`);
        return;
    }
    
    // VALIDACIÓN: Verificar si es horario extra y mostrar advertencia
    const isExtraTime = isExtraScheduleTime(selectedTime);
    if (isExtraTime && conversationState.scheduleType !== 'extra') {
        const service = conversationState.selectedService;
        const extraPrice = service.price * 2;
        
        await message.reply(`⚠️ ADVERTENCIA: Has seleccionado un horario extra (${selectedTime}).\n\n🌙 Este horario tiene un precio doble:\n💰 Precio normal: $${service.price.toLocaleString()} COP\n💰 Precio extra: $${extraPrice.toLocaleString()} COP\n\n¿Confirmas que quieres continuar con este horario extra?`);
        
        // Actualizar el tipo de horario a extra
        conversationManager.updateConversationState(phoneNumber, {
            scheduleType: 'extra'
        });
        return;
    }
    
    // Validar que el horario esté disponible ANTES de proceder
    if (conversationState.selectedDate && conversationState.selectedBarber) {
        // Convertir la fecha string a objeto Date
        const [day, month, year] = conversationState.selectedDate.split('/');
        const selectedDate = new Date(year, month - 1, day);
        
        // Obtener citas existentes para esta fecha del barbero seleccionado
        const barberCalendarId = conversationState.selectedBarber.calendarId;
        const existingAppointments = await getExistingAppointments(calendarAuth, selectedDate, barberCalendarId);
        
        // Verificar si el horario está ocupado
        const isTimeOccupied = existingAppointments.some(appointment => {
            const appointmentTime = extractTimeFromAppointment(appointment);
            return appointmentTime === selectedTime;
        });
        
        if (isTimeOccupied) {
            const scheduleType = conversationState.scheduleType || 'general';
            await message.reply(`❌ Lo siento, el horario ${selectedTime} ya está ocupado para ${conversationState.selectedBarber.name}.\n\nPor favor, selecciona otro horario disponible:\n\n${getAvailableTimeSlots(selectedDate, conversationState.selectedService.duration, existingAppointments, scheduleType).map((slot, index) => `${index + 1}. ${slot}`).join('\n')}`);
            return;
        }
    }
    
    conversationManager.updateConversationState(phoneNumber, {
        selectedTime: selectedTime
    });

    // Verificar si ya tenemos toda la información necesaria
    const updatedConversationState = conversationManager.getConversationState(phoneNumber);
    
    if (updatedConversationState.selectedBarber && 
        updatedConversationState.selectedService && 
        updatedConversationState.selectedDate && 
        updatedConversationState.selectedTime &&
        updatedConversationState.clientName &&
        updatedConversationState.clientPhone) {
        
        // VALIDAR DISPONIBILIDAD ANTES DE PEDIR CONFIRMACIÓN
        const [day, month, year] = updatedConversationState.selectedDate.split('/');
        const selectedDate = new Date(year, month - 1, day);
        const barberCalendarId = updatedConversationState.selectedBarber.calendarId;
        const existingAppointments = await getExistingAppointments(calendarAuth, selectedDate, barberCalendarId);
        
        // Verificar si el horario aún está disponible
        const isTimeOccupied = existingAppointments.some(appointment => {
            const appointmentTime = extractTimeFromAppointment(appointment);
            return appointmentTime === selectedTime;
        });
        
        if (isTimeOccupied) {
            const scheduleType = updatedConversationState.scheduleType || 'general';
            await message.reply(`❌ Lo siento, el horario ${selectedTime} ya no está disponible para ${updatedConversationState.selectedBarber.name}.\n\nPor favor, selecciona otro horario disponible:\n\n${getAvailableTimeSlots(selectedDate, updatedConversationState.selectedService.duration, existingAppointments, scheduleType).map((slot, index) => `${index + 1}. ${slot}`).join('\n')}`);
            
            // Volver al estado de selección de hora (preservar barbero, servicio y datos del cliente)
            conversationManager.updateConversationState(phoneNumber, {
                state: CONVERSATION_STATES.SELECTING_TIME,
                selectedBarber: conversationState.selectedBarber,
                selectedService: conversationState.selectedService,
                clientName: conversationState.clientName,
                clientPhone: conversationState.clientPhone
            });
            return;
        }
        
        // Si tenemos toda la información Y el horario está disponible, ir directo a confirmación
        conversationManager.updateConversationState(phoneNumber, {
            state: CONVERSATION_STATES.CONFIRMING
        });
        
        // Usar mensaje directo para confirmación (sin sugerencias)
        await message.reply(conversationManager.getConfirmationMessage(phoneNumber));
    } else {
        // Si falta información, determinar qué falta
        let nextStep = "";
        let nextState = CONVERSATION_STATES.MENU;
        
        if (!updatedConversationState.selectedBarber) {
            if (isAIEnabled()) {
                nextStep = "Primero, selecciona tu barbero preferido:\n\n" + getBarberMenuNatural();
            } else {
                nextStep = "Primero, selecciona tu barbero preferido:\n\n" + getBarberMenu();
            }
            nextState = CONVERSATION_STATES.SELECTING_BARBER;
        } else if (!updatedConversationState.selectedService) {
            if (isAIEnabled()) {
                nextStep = "¿Qué servicio quieres?";
                nextState = CONVERSATION_STATES.SELECTING_SERVICE;
            } else {
                nextStep = "Ahora selecciona el servicio que deseas:\n\n" + getServiceMenu();
                nextState = CONVERSATION_STATES.SELECTING_SERVICE;
            }
        } else if (!updatedConversationState.clientName) {
            nextStep = "Por favor, escribe tu nombre completo:";
            nextState = CONVERSATION_STATES.COLLECTING_NAME;
        } else if (!updatedConversationState.clientPhone) {
            nextStep = "Ahora por favor, escribe tu número de teléfono (ejemplo: 3001234567):";
            nextState = CONVERSATION_STATES.COLLECTING_PHONE;
        }
        
        conversationManager.updateConversationState(phoneNumber, {
            state: nextState
        });
        
        await message.reply(`✅ Hora seleccionada: ${selectedTime}\n\n${nextStep}`);
    }
}

// Manejar confirmación de cita
async function handleConfirmation(message, phoneNumber, text) {
    const response = text.toLowerCase().trim();

    if (response.includes("sí") || response.includes("si") || response.includes("confirmar") || response === "1" || response === "confirm_yes") {
        await confirmAppointment(message, phoneNumber);
    } else if (response.includes("no") || response.includes("cancelar") || response === "2" || response === "confirm_no") {
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
        
        // VALIDACIÓN: Verificar que no esté en horario de descanso
        if (conflictsWithBreakTime(appointmentData.time, service.duration)) {
            await message.reply(`❌ Lo siento, no se pueden agendar citas durante el horario de almuerzo (1:00 PM - 2:00 PM).\n\nPor favor, selecciona otro horario disponible.`);
            
            // Volver al estado de selección de hora
            const conversationState = conversationManager.getConversationState(phoneNumber);
            const [day, month, year] = appointmentData.date.split('/');
            const selectedDate = new Date(year, month - 1, day);
            const barberCalendarId = conversationState.selectedBarber.calendarId;
            const existingAppointments = await getExistingAppointments(calendarAuth, selectedDate, barberCalendarId);
            const scheduleType = conversationState.scheduleType || 'general';
            const timeSlots = getAvailableTimeSlots(selectedDate, service.duration, existingAppointments, scheduleType);
            
            await message.reply(`🕐 Horarios disponibles:\n\n${timeSlots.map((slot, index) => `${index + 1}. ${slot}`).join('\n')}\n\n¿A qué hora te gustaría la cita?`);
            
            conversationManager.updateConversationState(phoneNumber, {
                state: CONVERSATION_STATES.SELECTING_TIME,
                selectedBarber: conversationState.selectedBarber,
                selectedService: conversationState.selectedService,
                clientName: conversationState.clientName,
                clientPhone: conversationState.clientPhone
            });
            return;
        }

        // VALIDACIÓN FINAL: Verificar que el horario aún esté disponible
        const barber = appointmentData.barber;
        const existingAppointments = await getExistingAppointments(calendarAuth, appointmentDate, barber.calendarId);
        
        // Verificar si el horario está ocupado
        const isTimeOccupied = existingAppointments.some(appointment => {
            const appointmentTime = extractTimeFromAppointment(appointment);
            return appointmentTime === appointmentData.time;
        });
        
        if (isTimeOccupied) {
            const scheduleType = conversationState.scheduleType || 'general';
            await message.reply(`❌ Lo siento, el horario ${appointmentData.time} ya no está disponible para ${barber.name}.\n\nPor favor, selecciona otro horario disponible:\n\n${getAvailableTimeSlots(appointmentDate, service.duration, existingAppointments, scheduleType).map((slot, index) => `${index + 1}. ${slot}`).join('\n')}`);
            
            // Volver al estado de selección de hora (preservar barbero, servicio y datos del cliente)
            conversationManager.updateConversationState(phoneNumber, {
                state: CONVERSATION_STATES.SELECTING_TIME,
                selectedBarber: conversationState.selectedBarber,
                selectedService: conversationState.selectedService,
                clientName: conversationState.clientName,
                clientPhone: conversationState.clientPhone
            });
            return;
        }

        // Detectar automáticamente si es horario extra basándose en la hora
        const isExtraTime = isExtraScheduleTime(appointmentData.time);
        const scheduleType = appointmentData.scheduleType || (isExtraTime ? 'extra' : 'general');
        const finalPrice = scheduleType === 'extra' ? service.price * 2 : service.price;
        
        // Si es un reagendamiento, eliminar la cita original
        const conversationState = conversationManager.getConversationState(phoneNumber);
        if (conversationState.currentAppointment) {
            console.log(`🔄 Eliminando cita original para reagendamiento: ${conversationState.currentAppointment.id}`);
            await deleteAppointment(calendarAuth, conversationState.currentAppointment.id, conversationState.currentAppointment.calendarId);
        }

        // Crear evento en Google Calendar del barbero seleccionado
        const eventSummary = `${service.emoji} ${service.name} - ${appointmentData.clientName}`;
        const eventDescription = `Cliente: ${appointmentData.clientName}\nTeléfono: ${appointmentData.clientPhone}\nBarbero: ${barber.name}\nServicio: ${service.name}\nTipo de horario: ${scheduleType === 'extra' ? 'Extra' : 'General'}\nPrecio: $${finalPrice.toLocaleString()} COP\nDuración: ${service.duration} minutos`;

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

        // Determinar tipo de horario para el mensaje (solo mostrar si es extra)
        const scheduleTypeText = scheduleType === 'extra' ? '🌙 Horario Extra (Precio doble)' : '';
        
        await message.reply(`🎉 ¡CITA CONFIRMADA! 🎉

✅ ${service.emoji} ${service.name}
👤 Cliente: ${appointmentData.clientName}
📞 Teléfono: ${appointmentData.clientPhone}
👨‍💼 Barbero: ${barber.emoji} ${barber.name}
${scheduleTypeText}
📅 Fecha: ${appointmentData.date}
🕐 Hora: ${timeFormatted}
💰 Precio: $${finalPrice.toLocaleString()} COP
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

  // IA habilitada si está configurada
  if (isAIEnabled()) {
    const provider = getAIProvider();
    console.log(`🤖 IA habilitada: ${provider.name}`);
  } else {
    console.log("⚠️ IA deshabilitada, usando flujo tradicional");
  }

  // Inicializar WhatsApp
  client.initialize();
});