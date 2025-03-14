const { getOpenAIResponse } = require('../../services/openaiService.js');
const { clienteExiste, buscarClientePorTelefono } = require('../flujos/citas/db/buscarClientes.js');
const {
  guardarCliente, guardarCita
} = require('../flujos/citas/db/appointmentDB.js');
const { obtenerFechaHoraActual } = require('../flujos/citas/validacionesFechaHora.js');
const { getConversationFlowsText } = require('../../model/conversationFlows.js');

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
  let promptDatosRegistro = '';
  if (clienteYaRegistrado) {
    promptDatosRegistro = ` 
    Cita confirmada:
    {
      "fecha": "",
      "hora": "",
      "tipoReunion": ""
    }
    `
  } else {
    promptDatosRegistro = ` 
    Cita confirmada:
    {
      "nombre": "",
      "apellidos": "",
      "correo": "",
      "fecha": "",
      "hora": "",
      "empresa": "",
      "tipoReunion": ""
    }
    `
  }
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

${getConversationFlowsText()}

${state.citaGuardada ? '**Nota: Ya has agendado una cita. Si necesitas otra cita o modificar la existente, por favor indícalo claramente.**' : `**Al confirmar citas, incluye la información en formato JSON al final del mensaje, precedida por "===CITA_JSON===":*
===CITA_JSON===
${promptDatosRegistro}`}
`.trim();

  const messagesForOpenAI = [
    { role: "system", content: systemPrompt },
    ...state.messages,
    { role: "user", content: message }
  ];

  const response = await getOpenAIResponse(messagesForOpenAI);
  let cleanResponse = response.trim();

  // Detectar el marcador "===CITA_JSON==="
  const citaMarker = "===CITA_JSON===";
  const citaIndex = cleanResponse.indexOf(citaMarker);
  if (citaIndex !== -1 && !state.citaGuardada) {
    // Extraer el JSON
    const jsonStart = citaIndex + citaMarker.length;
    const jsonString = cleanResponse.substring(jsonStart).trim();
    try {
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No se encontró un objeto JSON válido");
      }

      const datosCita = JSON.parse(jsonMatch[0]);
      let clienteId;

      if (!clienteYaRegistrado) {
        const clienteResult = await guardarCliente({
          nombre_cliente: `${datosCita.nombre} ${datosCita.apellidos}`,
          correo_cliente: datosCita.correo,
          nombre_empresa: datosCita.empresa,
          telefono_cliente: sender
        });
        clienteId = clienteResult.cliente_id;
      } else {
        const clienteExistente = await buscarClientePorTelefono(sender);
        clienteId = clienteExistente.cliente_id;
      }

      let tipoReunionId = 1; // Por defecto virtual
      if (datosCita.tipoReunion) {
        const tipoReunion = datosCita.tipoReunion.toLowerCase();
        if (tipoReunion.includes('presencial') || tipoReunion === '2') {
          tipoReunionId = 2;
        } else if (tipoReunion.includes('virtual') || tipoReunion === '1') {
          tipoReunionId = 1;
           cleanResponse = cleanResponse.substring(0, citaIndex).trim();
        }
      }

      await guardarCita({
        cliente_id: clienteId,
        asesor_id: datosCita.asesorId || 1,
        tiporeunion_id: tipoReunionId,
        fecha_reunion: datosCita.fecha,
        hora_reunion: datosCita.hora,
        direccion: datosCita.tienda || 'Lima'
      });

      // Marcar que la cita ya ha sido guardada para este usuario
      state.citaGuardada = true;
      
      
      if (!tipoReunionId === 1) {
        cleanResponse = cleanResponse.substring(0, citaIndex).trim();
      }

      cleanResponse += `\n¡Tu cita ha sido confirmada para el ${datosCita.fecha} a las ${datosCita.hora}! Nos pondremos en contacto contigo pronto.`;
    } catch (error) {
      console.error("Error al parsear JSON o guardar cita:", error);
      cleanResponse = cleanResponse.substring(0, citaIndex).trim() + "\n\nLo siento, hubo un problema al confirmar tu cita. Por favor, intenta de nuevo más tarde.";
    }
  } else if (citaIndex !== -1 && state.citaGuardada) {
    
    cleanResponse = cleanResponse.substring(0, citaIndex).trim() + "\n\nYa tienes una cita agendada. Si deseas modificarla o agendar una nueva, por favor indícalo claramente.";
  }

  state.messages.push({ role: "user", content: message });
  state.messages.push({ role: "assistant", content: cleanResponse });
  if (state.messages.length > 10) state.messages = state.messages.slice(-10);

  return cleanResponse;
}

module.exports = {
  getResponseText: async (type, message, sender) => {
    try {
      return await processWithOpenAI(message, sender, null);
    } catch (error) {
      console.error("Error:", error);
      return "Lo siento, algo salió mal. ¿Puedes intentarlo de nuevo?";
    }
  }
};
