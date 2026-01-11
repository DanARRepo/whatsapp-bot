// Manejador de estados de conversación
class ConversationManager {
  constructor() {
    this.conversations = new Map(); // Almacena el estado de cada conversación
  }

  // Obtener o crear estado de conversación
  getConversationState(phoneNumber) {
    if (!this.conversations.has(phoneNumber)) {
      this.conversations.set(phoneNumber, {
        state: 'menu',
        selectedBarber: null,
        selectedService: null,
        clientName: null,
        clientPhone: null,
        selectedDate: null,
        selectedTime: null,
        appointmentData: null
      });
    }
    return this.conversations.get(phoneNumber);
  }

  // Actualizar estado de conversación
  updateConversationState(phoneNumber, updates) {
    const currentState = this.getConversationState(phoneNumber);
    this.conversations.set(phoneNumber, { ...currentState, ...updates });
  }

  // Limpiar estado de conversación (después de completar cita)
  clearConversationState(phoneNumber) {
    this.conversations.delete(phoneNumber);
  }

  // Obtener datos de la cita actual
  getAppointmentData(phoneNumber) {
    const state = this.getConversationState(phoneNumber);
    return {
      barber: state.selectedBarber,
      service: state.selectedService,
      clientName: state.clientName,
      clientPhone: state.clientPhone,
      date: state.selectedDate,
      time: state.selectedTime,
      scheduleType: state.scheduleType || 'general'
    };
  }

  // Validar si la conversación está en un estado específico
  isInState(phoneNumber, state) {
    return this.getConversationState(phoneNumber).state === state;
  }

  // Obtener mensaje de confirmación de cita
  getConfirmationMessage(phoneNumber) {
    const data = this.getAppointmentData(phoneNumber);
    const service = data.service;
    const barber = data.barber;
    const state = this.getConversationState(phoneNumber);
    const scheduleType = state.scheduleType || 'general';
    
    // Calcular precio según tipo de horario
    const basePrice = service.price;
    const finalPrice = scheduleType === 'extra' ? basePrice * 2 : basePrice;
    
    // Convertir hora a formato AM/PM
    const [hour, minute] = data.time.split(':');
    const hour24 = parseInt(hour);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    const timeFormatted = `${hour12}:${minute} ${ampm}`;
    
    // Determinar tipo de horario (solo mostrar si es extra)
    const scheduleTypeText = scheduleType === 'extra' ? '🌙 Horario Extra (Precio doble)' : '';
    
    return `📋 CONFIRMACIÓN DE CITA

👤 Cliente: ${data.clientName}
📞 Teléfono: ${data.clientPhone}
👨‍💼 Barbero: ${barber.emoji} ${barber.name}
✂️ Servicio: ${service.emoji} ${service.name}
${scheduleTypeText}
💰 Precio: $${finalPrice.toLocaleString()} COP
⏱️ Duración: ${service.duration} minutos
📅 Fecha: ${data.date}
🕐 Hora: ${timeFormatted}

¿Confirmas esta cita? Responde:
✅ SÍ - para confirmar
❌ NO - para cancelar`;
  }

  // Función para obtener mensaje de confirmación con botones
}

export default ConversationManager;
