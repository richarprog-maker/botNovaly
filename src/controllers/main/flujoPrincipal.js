const { getOpenAIResponse } = require('../../services/openaiService.js');
const { clienteExiste } = require('../flujos/citas/db/buscarClientes.js');
const { obtenerFechaHoraActual } = require('../flujos/citas/validacionesFechaHora.js');
const { getConversationFlowsText } = require('../../model/conversationFlows.js');
const { generarPromptDatosRegistro, inicializarDatosParciales, procesarRespuestaOpenAI } = require('../flujos/citas/flujoCitas.js');
const { obtenerDetallesUltimaCita } = require('../flujos/citas/db/ultimasCitas.js');
const { procesarReagendamientoOpenAI } = require('../flujos/citas/flujoReagendamiento.js');
const { procesarSolicitudAsesorOpenAI } = require('../flujos/citas/flujoSolicitudAsesor.js');

const conversationState = new Map();

function getOrCreateConversationState(sender) {
  let state = conversationState.get(sender);
  if (!state) {
    state = { data: {}, lastUpdated: Date.now(), messages: [], datosCita: {}, citaGuardada: false };
    conversationState.set(sender, state);
  }
  state.lastUpdated = Date.now();
  return state;
}

async function processWithOpenAI(message, sender, nombreCliente) {
  const state = getOrCreateConversationState(sender);
  const clienteYaRegistrado = await clienteExiste(sender);

  // Generar prompt para el registro de datos
  let promptDatosRegistro = generarPromptDatosRegistro(clienteYaRegistrado);
  
  // Obtener detalles de la última cita en formato JSON
  let detallesUltimaCita = await obtenerDetallesUltimaCita(sender);
  inicializarDatosParciales(state, clienteYaRegistrado);

  const fechaHoraActual = obtenerFechaHoraActual();
  const fechaActualISO = `${fechaHoraActual.año}-${String(fechaHoraActual.mes).padStart(2, '0')}-${String(fechaHoraActual.dia).padStart(2, '0')}`;
  const hora = `${fechaHoraActual.hora}:${fechaHoraActual.minuto}`;

  const systemPrompt = `
Eres Valeria, asistente virtual de Novaly, experta en atención al cliente de un servicio de TI.

**Fecha actual:** ${fechaActualISO}
**Hora actual:** ${hora}

**Servicios Disponibles:**
✅ Asistentes Virtuales con IA 🤖 - Bots inteligentes que mejoran la atención al cliente.
✅ Desarrollo de Software a Medida & Cloud 💻 - Lo que imagines, lo hacemos realidad.
✅ Automatización de Procesos con BI 📊- Optimización de tareas mediante tableros inteligentes.
✅ Desarrollo del Talento Digital 🚀 - Capacitación para la adopción de tecnología.

**Precios:**
🔹 Software as a Service (saas): Desde 59 dólares mensuales, ideal para funciones estándar.
🔹 Personalización: En base a la tecnología personalizada creamos un bot según tus necesidades específicas.

**Seguridad:**
🔹 Cifrado de datos para proteger la información.
🔹 Cumplimos con normativas de seguridad digital.
🔹 Accesos controlados para evitar filtraciones.
**Detalles de última cita:**
${typeof detallesUltimaCita === 'object' && detallesUltimaCita.textoFormateado ? detallesUltimaCita.textoFormateado : detallesUltimaCita}

${getConversationFlowsText()}

${state.citaGuardada ? `**Nota: Ya has agendado una cita o si quieres o si deseas reagendarla, incluye la información en formato JSON al final del mensaje, precedida por "===REAGENDAMIENTO_JSON===":*
===REAGENDAMIENTO_JSON===
 {
      "fecha": "",
      "hora": "",
      "tipoReunion": "",
      "direccion": ""
    }
` : `**Al confirmar citas, incluye la información en formato JSON al final del mensaje, precedida por "===CITA_JSON===":*
===CITA_JSON===
${promptDatosRegistro}`}

**Cuando un cliente solicite hablar con un asesor, incluye la información en formato JSON al final del mensaje, precedida por "===SOLICITUD_ASESOR_JSON===":*
===SOLICITUD_ASESOR_JSON===
{
  "horario": ""
}

${clienteYaRegistrado ? '**Nota: Ya estás registrado en nuestro sistema. Solo necesitas proporcionar los datos de la cita.**' : ''}
`.trim();

  const messagesForOpenAI = [
    { role: "system", content: systemPrompt },
    ...state.messages,
    { role: "user", content: message }
  ];

  const response = await getOpenAIResponse(messagesForOpenAI);
 
  let cleanResponse;
  try {
    // Verificar si es un reagendamiento
    if (state.citaGuardada && response.includes("===REAGENDAMIENTO_JSON===")) {
      cleanResponse = await procesarReagendamientoOpenAI(response, state, sender);
    } 
    // Verificar si es una solicitud de asesor
    else if (response.includes("===SOLICITUD_ASESOR_JSON===")) {
      cleanResponse = await procesarSolicitudAsesorOpenAI(response, state, sender);
    } else {
      cleanResponse = await procesarRespuestaOpenAI(response, state, sender);
    }
  } catch (error) {
    console.error("Error al procesar respuesta OpenAI:", error);
    cleanResponse = "Lo siento, hubo un problema al procesar tu solicitud. Por favor, intenta de nuevo.";
  }

  // Mantener los mensajes dentro de un límite para evitar sobrecargar la memoria
  state.messages.push({ role: "user", content: message });
  state.messages.push({ role: "assistant", content: cleanResponse });
  if (state.messages.length > 10) state.messages = state.messages.slice(-10);

  return cleanResponse;
}

module.exports = {
  getResponseText: async (type, message, sender) => {
    try {
      console.log("Mensaje recibido:", message);
      console.log("Sender:", sender);
      return await processWithOpenAI(message, sender, null);
    } catch (error) {
      console.error("Error:", error);
      return "Lo siento, algo salió mal. ¿Puedes intentarlo de nuevo?";
    }
  }
};
