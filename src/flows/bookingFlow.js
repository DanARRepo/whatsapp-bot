/**
 * Flujo de agendamiento de citas
 * 
 * NOTA: Este archivo contiene stubs que necesitan ser completados con la lógica
 * extraída de index.js. Por ahora, importa temporalmente desde index.js para mantener
 * la funcionalidad mientras se completa la migración.
 */

import { CONVERSATION_STATES } from '../config/constants.js';
import { BARBERS, identifyBarber } from '../data/barbers.js';
import { SERVICES, identifyService } from '../data/services.js';
import { getBarberMenu, getBarberMenuNatural, getServiceMenu, getServicesAndPrices, getTimeSlotsNatural } from '../config/messages.js';
import { isExtraScheduleTime, conflictsWithBreakTime } from '../config/business.js';
import { getAvailableTimeSlots, extractTimeFromAppointment } from '../services/bookingService.js';
import { getExistingAppointments, createEvent, deleteAppointment } from '../services/googleCalendar.js';
import { parseNaturalDate, parseNaturalTime, parseNaturalDateAndTime } from '../utils/dateTimeParser.js';
import { processNaturalLanguage, isAIResponseReliable, isAIEnabled } from '../aiProviders/index.js';

/**
 * Función auxiliar para enviar mensajes con lenguaje natural cuando IA está habilitada
 */
async function sendMessageWithNaturalLanguage(message, text, suggestions = []) {
  let messageText = text;
  
  if (suggestions.length > 0) {
    messageText += '\n\n💡 Puedes responder de forma natural, por ejemplo:\n';
    suggestions.forEach((suggestion) => {
      messageText += `• ${suggestion}\n`;
    });
  }
  
  await message.reply(messageText);
}

/**
 * Maneja la selección de barbero
 * TODO: Extraer lógica completa de index.js handleBarberSelection
 */
export async function handleBarberSelection(message, phoneNumber, text, conversationState, dependencies) {
  const { conversationManager } = dependencies;
  const option = text.trim();

  // Detectar nombres de barberos en el texto
  const barberNames = Object.values(BARBERS).map(b => b.name.toLowerCase());
  const mentionedBarber = barberNames.find(name => text.includes(name));

  if (option === "1" || option === "barber_1" || mentionedBarber === BARBERS.BARBER_1.name.toLowerCase()) {
    const barber = BARBERS.BARBER_1;
    conversationManager.updateConversationState(phoneNumber, {
      state: CONVERSATION_STATES.SELECTING_SERVICE,
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
    const barber = BARBERS.BARBER_2;
    conversationManager.updateConversationState(phoneNumber, {
      state: CONVERSATION_STATES.SELECTING_SERVICE,
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
    const infoRequests = ["servicios", "precios", "que tienen", "que ofrecen", "informacion", "ayuda"];
    const isInfoRequest = infoRequests.some(info => text.includes(info));
    
    if (isInfoRequest) {
      await message.reply(getServicesAndPrices());
    } else {
      await message.reply("❌ Opción no válida. Por favor, responde con 1 o 2.\n\n💡 Si quieres empezar de nuevo, escribe 'hola' o 'menu'.");
    }
  }
}

/**
 * Maneja la selección de servicio
 * TODO: Extraer lógica completa de index.js handleServiceSelection
 */
export async function handleServiceSelection(message, phoneNumber, text, conversationState, dependencies) {
  const { conversationManager } = dependencies;
  
  // Intentar identificar el servicio usando IA si está habilitada
  if (isAIEnabled()) {
    try {
      const aiResponse = await processNaturalLanguage(text, conversationState);
      
      if (aiResponse.intent === 'book_appointment' && aiResponse.service) {
        const selectedService = identifyService(aiResponse.service);
        if (selectedService) {
          conversationManager.updateConversationState(phoneNumber, {
            selectedService: selectedService,
            state: CONVERSATION_STATES.SELECTING_DATE
          });
          
          if (conversationState.selectedDate) {
            await message.reply(`¡Perfecto! He entendido tu solicitud:\n\nBarbero: ${conversationState.selectedBarber.emoji} ${conversationState.selectedBarber.name}\nServicio: ${selectedService.emoji} ${selectedService.name}\nFecha: 📅 ${conversationState.selectedDate}\n\n¿A qué hora te gustaría la cita?`);
            conversationManager.updateConversationState(phoneNumber, {
              state: CONVERSATION_STATES.SELECTING_TIME
            });
          } else {
            await message.reply(`¡Perfecto! He entendido tu solicitud:\n\nBarbero: ${conversationState.selectedBarber.emoji} ${conversationState.selectedBarber.name}\nServicio: ${selectedService.emoji} ${selectedService.name}\n\n¿Para qué fecha te gustaría agendar tu cita?`);
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
    if (conversationState.selectedDate) {
      await message.reply(`¡Perfecto! He entendido tu solicitud:\n\nBarbero: ${conversationState.selectedBarber.emoji} ${conversationState.selectedBarber.name}\nServicio: ${selectedService.emoji} ${selectedService.name}\nFecha: 📅 ${conversationState.selectedDate}\n\n¿A qué hora te gustaría la cita?`);
      conversationManager.updateConversationState(phoneNumber, {
        selectedService: selectedService,
        state: CONVERSATION_STATES.SELECTING_TIME
      });
    } else {
      await message.reply(`¡Perfecto! He entendido tu solicitud:\n\nBarbero: ${conversationState.selectedBarber.emoji} ${conversationState.selectedBarber.name}\nServicio: ${selectedService.emoji} ${selectedService.name}\n\n¿Para qué fecha te gustaría agendar tu cita?`);
      conversationManager.updateConversationState(phoneNumber, {
        selectedService: selectedService,
        state: CONVERSATION_STATES.SELECTING_DATE
      });
    }
  } else {
    await message.reply(`📋 Aquí tienes nuestros servicios disponibles:\n\n${getServicesAndPrices()}\n\n¿Cuál servicio te gustaría?`);
  }
}

/**
 * Maneja la entrada del nombre
 * TODO: Extraer lógica completa de index.js handleNameInput
 */
export async function handleNameInput(message, phoneNumber, text, conversationState, dependencies) {
  const { conversationManager } = dependencies;
  const name = text.trim();
  
  if (name.length < 2) {
    await message.reply("❌ Por favor, escribe tu nombre completo (mínimo 2 caracteres):");
    return;
  }

  conversationManager.updateConversationState(phoneNumber, {
    state: CONVERSATION_STATES.COLLECTING_PHONE,
    clientName: name
  });

  const whatsappNumber = phoneNumber.replace("@c.us", "");
  
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

/**
 * Maneja la entrada del teléfono
 * TODO: Extraer lógica completa de index.js handlePhoneInput
 */
export async function handlePhoneInput(message, phoneNumber, text, conversationState, dependencies) {
  const { conversationManager } = dependencies;
  const input = text.trim();
  
  const phoneRegex = /^\d{10}$/;
  if (phoneRegex.test(input)) {
    await processPhoneNumber(message, phoneNumber, input, conversationState, dependencies);
    return;
  }
  
  if (isAIEnabled()) {
    try {
      const aiResponse = await processNaturalLanguage(input, {
        context: "El usuario está eligiendo qué número de teléfono usar para su cita.",
        currentState: {
          whatsappNumber: phoneNumber.replace("@c.us", "")
        }
      });
      
      if (aiResponse && aiResponse.use_current_phone === true) {
        const whatsappNumber = phoneNumber.replace("@c.us", "");
        let phoneToUse = whatsappNumber;
        if (whatsappNumber.length === 12 && whatsappNumber.startsWith('57')) {
          phoneToUse = whatsappNumber.substring(2);
        }
        await processPhoneNumber(message, phoneNumber, phoneToUse, conversationState, dependencies);
        return;
      } else if (aiResponse && aiResponse.use_current_phone === false) {
        await message.reply("Por favor, escribe el número de teléfono que quieres usar (ejemplo: 3001234567):");
        return;
      }
    } catch (error) {
      console.error(`[${phoneNumber}] Error processing with AI:`, error);
    }
  }
  
  if (input === "1" || input === "use_current_phone") {
    const whatsappNumber = phoneNumber.replace("@c.us", "");
    let phoneToUse = whatsappNumber;
    if (whatsappNumber.length === 12 && whatsappNumber.startsWith('57')) {
      phoneToUse = whatsappNumber.substring(2);
    }
    await processPhoneNumber(message, phoneNumber, phoneToUse, conversationState, dependencies);
    return;
  } else if (input === "2" || input === "use_different_phone") {
    await message.reply("Por favor, escribe el número de teléfono que quieres usar (ejemplo: 3001234567):");
    return;
  }
  
  await message.reply("❌ Por favor, responde con 1 para usar tu número actual o 2 para registrar un número diferente.");
}

/**
 * Procesa el número de teléfono
 */
async function processPhoneNumber(message, phoneNumber, phone, conversationState, dependencies) {
  const { conversationManager, calendarAuth } = dependencies;
  
  conversationManager.updateConversationState(phoneNumber, {
    state: CONVERSATION_STATES.SELECTING_DATE,
    clientPhone: phone
  });

  const updatedState = conversationManager.getConversationState(phoneNumber);
  
  if (updatedState.selectedDate && updatedState.selectedTime) {
    conversationManager.updateConversationState(phoneNumber, {
      state: CONVERSATION_STATES.CONFIRMING
    });
    await message.reply(conversationManager.getConfirmationMessage(phoneNumber));
  } else if (updatedState.selectedDate) {
    conversationManager.updateConversationState(phoneNumber, {
      state: CONVERSATION_STATES.SELECTING_TIME
    });
    await message.reply(`✅ Teléfono registrado: ${phone}\n\n¿A qué hora te gustaría la cita?`);
  } else {
    await message.reply(`✅ Teléfono registrado: ${phone}\n\n¿Para qué fecha te gustaría agendar tu cita?`);
  }
}

/**
 * Maneja la selección de fecha
 * TODO: Extraer lógica completa de index.js handleDateSelection
 */
export async function handleDateSelection(message, phoneNumber, text, conversationState, dependencies) {
  const { conversationManager, calendarAuth } = dependencies;
  
  // Intentar procesar fecha Y hora natural primero
  let naturalDateTime = parseNaturalDateAndTime(text);
  if (naturalDateTime.date) {
    conversationManager.updateConversationState(phoneNumber, {
      selectedDate: naturalDateTime.date
    });
    
    if (naturalDateTime.time) {
      conversationManager.updateConversationState(phoneNumber, {
        selectedTime: naturalDateTime.time
      });
      
      if (isExtraScheduleTime(naturalDateTime.time)) {
        await message.reply(`⚠️ ADVERTENCIA: Has seleccionado un horario extra (${naturalDateTime.time}).\n\n🌙 Este horario tiene un precio doble.\n\n¿Confirmas que quieres continuar con este horario extra?`);
        conversationManager.updateConversationState(phoneNumber, {
          scheduleType: 'extra'
        });
        return;
      }
    }
    
    await processSelectedDate(message, phoneNumber, naturalDateTime.date, conversationState, dependencies);
    return;
  }

  // Fallback: intentar solo fecha natural
  let naturalDate = parseNaturalDate(text);
  if (naturalDate) {
    await processSelectedDate(message, phoneNumber, naturalDate, conversationState, dependencies);
    return;
  }

  // Si no se pudo procesar con parseNaturalDate, intentar con IA
  if (isAIEnabled()) {
    const aiResponse = await processNaturalLanguage(text, conversationState);
    
    if (aiResponse && isAIResponseReliable(aiResponse) && aiResponse.date) {
      if (aiResponse.time) {
        conversationManager.updateConversationState(phoneNumber, {
          selectedDate: aiResponse.date,
          selectedTime: aiResponse.time
        });
      } else {
        conversationManager.updateConversationState(phoneNumber, {
          selectedDate: aiResponse.date
        });
      }
      
      await processSelectedDate(message, phoneNumber, aiResponse.date, conversationState, dependencies);
      return;
    }
  }
  
  await message.reply("❌ No pude entender la fecha. Por favor, intenta de nuevo:\n\n• 'Hoy' o 'mañana'\n• 'El próximo martes'\n• '15 de diciembre'");
}

/**
 * Procesa la fecha seleccionada
 */
async function processSelectedDate(message, phoneNumber, dateInput, conversationState, dependencies) {
  const { conversationManager, calendarAuth } = dependencies;
  
  const [day, month, year] = dateInput.split('/');
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

  const updatedState = conversationManager.getConversationState(phoneNumber);
  
  if (!updatedState.selectedTime) {
    conversationManager.updateConversationState(phoneNumber, {
      state: CONVERSATION_STATES.SELECTING_TIME
    });

    let existingAppointments;
    try {
      existingAppointments = await getExistingAppointments(calendarAuth, selectedDate, updatedState.selectedBarber.calendarId);
    } catch (error) {
      console.error(`❌ Error al obtener citas existentes:`, error.message);
      existingAppointments = [];
    }

    const scheduleType = updatedState.scheduleType || 'general';
    const timeSlots = getAvailableTimeSlots(selectedDate, updatedState.selectedService.duration, existingAppointments, scheduleType);

    if (timeSlots.length === 0) {
      await message.reply(`❌ No hay horarios disponibles para el ${dateInput}.\n\nPor favor, selecciona otra fecha:`);
      return;
    }

    if (isAIEnabled()) {
      await message.reply(`✅ Fecha seleccionada: ${dateInput}\n\n${getTimeSlotsNatural(timeSlots)}`);
    } else {
      await message.reply(`✅ Fecha seleccionada: ${dateInput}\n\nSelecciona un horario disponible:\n\n${timeSlots.map((slot, index) => `${index + 1}. ${slot}`).join('\n')}\n\nResponde con el número de la opción que prefieras:`);
    }
  } else {
    // Si ya tenemos hora, verificar qué falta
    if (!updatedState.clientName) {
      conversationManager.updateConversationState(phoneNumber, {
        state: CONVERSATION_STATES.COLLECTING_NAME
      });
      await message.reply(`✅ Fecha seleccionada: ${dateInput}\n\nPor favor, escribe tu nombre completo:`);
    } else if (!updatedState.clientPhone) {
      conversationManager.updateConversationState(phoneNumber, {
        state: CONVERSATION_STATES.COLLECTING_PHONE
      });
      await message.reply(`✅ Fecha seleccionada: ${dateInput}\n\nAhora por favor, escribe tu número de teléfono (ejemplo: 3001234567):`);
    }
  }
}

/**
 * Maneja la selección de tipo de horario
 * TODO: Extraer lógica completa de index.js handleScheduleTypeSelection
 */
export async function handleScheduleTypeSelection(message, phoneNumber, text, conversationState, dependencies) {
  const { conversationManager } = dependencies;
  
  if (isAIEnabled()) {
    try {
      const aiResponse = await processNaturalLanguage(text, conversationState);
      
      if (aiResponse && aiResponse.scheduleType) {
        const scheduleType = aiResponse.scheduleType.toLowerCase();
        if (scheduleType === 'extra' || scheduleType === 'especial') {
          conversationManager.updateConversationState(phoneNumber, {
            scheduleType: 'extra',
            state: CONVERSATION_STATES.SELECTING_DATE
          });
          await message.reply("✅ Horario extra seleccionado. ¿Para qué fecha te gustaría agendar tu cita?");
          return;
        } else if (scheduleType === 'general' || scheduleType === 'normal') {
          conversationManager.updateConversationState(phoneNumber, {
            scheduleType: 'general',
            state: CONVERSATION_STATES.SELECTING_DATE
          });
          await message.reply("✅ Horario general seleccionado. ¿Para qué fecha te gustaría agendar tu cita?");
          return;
        }
      }
    } catch (error) {
      console.error(`❌ Error procesando tipo de horario con IA:`, error);
    }
  }
  
  if (text === "1" || text === "general") {
    conversationManager.updateConversationState(phoneNumber, {
      scheduleType: 'general',
      state: CONVERSATION_STATES.SELECTING_DATE
    });
    await message.reply("✅ Horario general seleccionado. ¿Para qué fecha te gustaría agendar tu cita?");
  } else if (text === "2" || text === "extra") {
    conversationManager.updateConversationState(phoneNumber, {
      scheduleType: 'extra',
      state: CONVERSATION_STATES.SELECTING_DATE
    });
    await message.reply("✅ Horario extra seleccionado. ¿Para qué fecha te gustaría agendar tu cita?");
  } else {
    await message.reply("❌ Opción no válida. Por favor, responde con 1 para horario general o 2 para horario extra.");
  }
}

/**
 * Maneja la selección de hora
 * TODO: Extraer lógica completa de index.js handleTimeSelection
 */
export async function handleTimeSelection(message, phoneNumber, text, conversationState, dependencies) {
  const { conversationManager, calendarAuth } = dependencies;
  
  if (!conversationState.selectedBarber || !conversationState.selectedService || !conversationState.selectedDate) {
    await message.reply("❌ Error: Faltan datos. Por favor, reinicia la conversación escribiendo 'hola'.");
    return;
  }
  
  const [day, month, year] = conversationState.selectedDate.split('/');
  const selectedDate = new Date(year, month - 1, day);
  const barberCalendarId = conversationState.selectedBarber.calendarId;
  const existingAppointments = await getExistingAppointments(calendarAuth, selectedDate, barberCalendarId);
  const scheduleType = conversationState.scheduleType || 'general';
  const timeSlots = getAvailableTimeSlots(selectedDate, conversationState.selectedService.duration, existingAppointments, scheduleType);
  
  let selectedTime = null;
  if (text.includes(':')) {
    selectedTime = parseNaturalTime(text);
  } else {
    const timeIndex = parseInt(text) - 1;
    if (timeIndex >= 0 && timeIndex < timeSlots.length) {
      selectedTime = timeSlots[timeIndex];
    }
  }
  
  if (selectedTime && isExtraScheduleTime(selectedTime) && conversationState.scheduleType !== 'extra') {
    const service = conversationState.selectedService;
    const extraPrice = service.price * 2;
    await message.reply(`⚠️ ADVERTENCIA: Has seleccionado un horario extra (${selectedTime}).\n\n🌙 Este horario tiene un precio doble:\n💰 Precio normal: $${service.price.toLocaleString()} COP\n💰 Precio extra: $${extraPrice.toLocaleString()} COP\n\n¿Confirmas que quieres continuar con este horario extra?`);
    conversationManager.updateConversationState(phoneNumber, {
      scheduleType: 'extra'
    });
    return;
  }
  
  if (selectedTime) {
    await processSelectedTime(message, phoneNumber, selectedTime, conversationState, dependencies);
  } else {
    await message.reply("❌ Opción de horario inválida. Por favor, selecciona un número válido.");
  }
}

/**
 * Procesa la hora seleccionada
 */
async function processSelectedTime(message, phoneNumber, selectedTime, conversationState, dependencies) {
  const { conversationManager, calendarAuth } = dependencies;
  
  if (conflictsWithBreakTime(selectedTime, conversationState.selectedService.duration)) {
    await message.reply(`❌ Lo siento, no se pueden agendar citas durante el horario de almuerzo (1:00 PM - 2:00 PM).\n\nPor favor, selecciona otro horario disponible.`);
    return;
  }
  
  const isExtraTime = isExtraScheduleTime(selectedTime);
  if (isExtraTime && conversationState.scheduleType !== 'extra') {
    const service = conversationState.selectedService;
    const extraPrice = service.price * 2;
    await message.reply(`⚠️ ADVERTENCIA: Has seleccionado un horario extra (${selectedTime}).\n\n🌙 Este horario tiene un precio doble:\n💰 Precio normal: $${service.price.toLocaleString()} COP\n💰 Precio extra: $${extraPrice.toLocaleString()} COP\n\n¿Confirmas que quieres continuar con este horario extra?`);
    conversationManager.updateConversationState(phoneNumber, {
      scheduleType: 'extra'
    });
    return;
  }
  
  const [day, month, year] = conversationState.selectedDate.split('/');
  const selectedDate = new Date(year, month - 1, day);
  const existingAppointments = await getExistingAppointments(calendarAuth, selectedDate, conversationState.selectedBarber.calendarId);
  
  const isTimeOccupied = existingAppointments.some(appointment => {
    const appointmentTime = extractTimeFromAppointment(appointment);
    return appointmentTime === selectedTime;
  });
  
  if (isTimeOccupied) {
    const scheduleType = conversationState.scheduleType || 'general';
    const timeSlots = getAvailableTimeSlots(selectedDate, conversationState.selectedService.duration, existingAppointments, scheduleType);
    await message.reply(`❌ Lo siento, el horario ${selectedTime} ya está ocupado.\n\nPor favor, selecciona otro horario disponible:\n\n${timeSlots.map((slot, index) => `${index + 1}. ${slot}`).join('\n')}`);
    return;
  }
  
  conversationManager.updateConversationState(phoneNumber, {
    selectedTime: selectedTime
  });

  const updatedState = conversationManager.getConversationState(phoneNumber);
  
  if (updatedState.selectedBarber && 
      updatedState.selectedService && 
      updatedState.selectedDate && 
      updatedState.selectedTime &&
      updatedState.clientName &&
      updatedState.clientPhone) {
    conversationManager.updateConversationState(phoneNumber, {
      state: CONVERSATION_STATES.CONFIRMING
    });
    await message.reply(conversationManager.getConfirmationMessage(phoneNumber));
  } else {
    if (!updatedState.clientName) {
      conversationManager.updateConversationState(phoneNumber, {
        state: CONVERSATION_STATES.COLLECTING_NAME
      });
      await message.reply(`✅ Hora seleccionada: ${selectedTime}\n\nPor favor, escribe tu nombre completo:`);
    } else if (!updatedState.clientPhone) {
      conversationManager.updateConversationState(phoneNumber, {
        state: CONVERSATION_STATES.COLLECTING_PHONE
      });
      await message.reply(`✅ Hora seleccionada: ${selectedTime}\n\nAhora por favor, escribe tu número de teléfono (ejemplo: 3001234567):`);
    }
  }
}

/**
 * Maneja la confirmación de cita
 * TODO: Extraer lógica completa de index.js handleConfirmation
 */
export async function handleConfirmation(message, phoneNumber, text, conversationState, dependencies) {
  const { conversationManager, calendarAuth } = dependencies;
  const response = text.toLowerCase().trim();

  if (response.includes("sí") || response.includes("si") || response.includes("confirmar") || response === "1" || response === "confirm_yes") {
    await confirmAppointment(message, phoneNumber, conversationState, dependencies);
  } else if (response.includes("no") || response.includes("cancelar") || response === "2" || response === "confirm_no") {
    conversationManager.clearConversationState(phoneNumber);
    await message.reply("❌ Cita cancelada. Si cambias de opinión, puedes escribir 'hola' para comenzar de nuevo.");
  } else {
    await message.reply("❌ Por favor, responde con SÍ para confirmar o NO para cancelar.");
  }
}

/**
 * Confirma la cita y la crea en el calendario
 */
async function confirmAppointment(message, phoneNumber, conversationState, dependencies) {
  const { conversationManager, calendarAuth } = dependencies;
  
  try {
    const appointmentData = conversationManager.getAppointmentData(phoneNumber);
    const service = appointmentData.service;

    const [day, month, year] = appointmentData.date.split('/');
    const [hour, minute] = appointmentData.time.split(':');
    const appointmentDate = new Date(year, month - 1, day, hour, minute);
    const endDate = new Date(appointmentDate.getTime() + (service.duration * 60000));
    
    if (conflictsWithBreakTime(appointmentData.time, service.duration)) {
      await message.reply(`❌ Lo siento, no se pueden agendar citas durante el horario de almuerzo (1:00 PM - 2:00 PM).\n\nPor favor, selecciona otro horario disponible.`);
      return;
    }

    const barber = appointmentData.barber;
    const existingAppointments = await getExistingAppointments(calendarAuth, appointmentDate, barber.calendarId);
    
    const isTimeOccupied = existingAppointments.some(appointment => {
      const appointmentTime = extractTimeFromAppointment(appointment);
      return appointmentTime === appointmentData.time;
    });
    
    if (isTimeOccupied) {
      await message.reply(`❌ Lo siento, el horario ${appointmentData.time} ya no está disponible.\n\nPor favor, selecciona otro horario disponible.`);
      return;
    }

    const isExtraTime = isExtraScheduleTime(appointmentData.time);
    const scheduleType = appointmentData.scheduleType || (isExtraTime ? 'extra' : 'general');
    const finalPrice = scheduleType === 'extra' ? service.price * 2 : service.price;
    
    const currentState = conversationManager.getConversationState(phoneNumber);
    if (currentState.currentAppointment) {
      await deleteAppointment(calendarAuth, currentState.currentAppointment.id, currentState.currentAppointment.calendarId);
    }

    const eventSummary = `${service.emoji} ${service.name} - ${appointmentData.clientName}`;
    const eventDescription = `Cliente: ${appointmentData.clientName}\nTeléfono: ${appointmentData.clientPhone}\nBarbero: ${barber.name}\nServicio: ${service.name}\nTipo de horario: ${scheduleType === 'extra' ? 'Extra' : 'General'}\nPrecio: $${finalPrice.toLocaleString()} COP\nDuración: ${service.duration} minutos`;

    await createEvent(calendarAuth, {
      summary: eventSummary,
      description: eventDescription,
      startTime: appointmentDate,
      endTime: endDate,
      barberCalendarId: barber.calendarId
    });

    const hour24 = parseInt(hour);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    const timeFormatted = `${hour12}:${minute} ${ampm}`;
    const scheduleTypeText = scheduleType === 'extra' ? '🌙 Horario Extra (Precio doble)\n' : '';
    
    await message.reply(`🎉 ¡CITA CONFIRMADA! 🎉

✅ ${service.emoji} ${service.name}
👤 Cliente: ${appointmentData.clientName}
📞 Teléfono: ${appointmentData.clientPhone}
👨‍💼 Barbero: ${barber.emoji} ${barber.name}
${scheduleTypeText}📅 Fecha: ${appointmentData.date}
🕐 Hora: ${timeFormatted}
💰 Precio: $${finalPrice.toLocaleString()} COP
⏱️ Duración: ${service.duration} minutos

¡Te esperamos! 💈`);

    conversationManager.clearConversationState(phoneNumber);

  } catch (error) {
    console.error("Error creating appointment:", error);
    await message.reply("❌ Error al crear la cita. Por favor, intenta de nuevo más tarde.");
  }
}

/**
 * Maneja fecha ambigua
 */
export async function handleAmbiguousDate(message, phoneNumber, text, conversationState, dependencies) {
  const { conversationManager } = dependencies;
  
  let naturalDate = parseNaturalDate(text);
  if (naturalDate) {
    await processSelectedDate(message, phoneNumber, naturalDate, conversationState, dependencies);
  } else {
    await message.reply(`🤔 No pude entender la fecha. Por favor, dime específicamente:\n\n• "Hoy" o "mañana"\n• "El próximo martes" o "el viernes"\n• "15 de diciembre" o "el 20"\n• O cualquier fecha que prefieras`);
  }
}
