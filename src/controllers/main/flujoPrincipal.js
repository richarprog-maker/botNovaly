const { getOpenAIResponse } = require('../../services/openaiService.js');
const { clienteExiste, buscarClientePorTelefono } = require('../flujos/citas/db/buscarClientes.js');
const {
  guardarCliente, guardarCita
} = require('../flujos/citas/db/appointmentDB.js');
const { obtenerFechaHoraActual } = require('../flujos/citas/validacionesFechaHora.js');

const conversationState = new Map();

function getOrCreateConversationState(sender) {
  let state = conversationState.get(sender);
  if (!state) {
    state = { data: {}, lastUpdated: Date.now(), messages: [], datosCita: {} };
    conversationState.set(sender, state);
  }
  state.lastUpdated = Date.now();
  return state;
}

async function processWithOpenAI(message, sender, nombreCliente) {
  const state = getOrCreateConversationState(sender);
  const clienteYaRegistrado = await clienteExiste(sender);
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

**Flujos de conversación:**

1. SALUDO INICIAL:
   - Si el cliente saluda, preséntate como Valeria y pregunta su nombre.
   - Si el cliente proporciona su nombre, usa ese nombre en tus respuestas.
   - Si el cliente no desea dar su nombre, continúa sin problema.

2. CONSULTA SOBRE SERVICIOS Y PRECIOS:
   - Presenta los servicios de Novaly con sus emojis correspondientes.
   - Menciona que los precios dependen del nivel de personalización.
   - Ofrece agendar una reunión para analizar opciones.

3. CONSULTA ESPECÍFICA DE PRECIOS:
   - Menciona las opciones modulares desde 59 dólares mensuales.
   - Explica que hay opciones personalizadas según necesidades.
   - Sugiere agendar una reunión para cotización precisa.

4. CONSULTA SOBRE SERVICIOS ESPECÍFICOS:
   - Proporciona detalles sobre el servicio consultado.
   - Explica los beneficios (centralización, reducción de tiempo, etc).
   - Menciona casos de éxito si es relevante.

5. CONSULTA SOBRE SEGURIDAD:
   - Asegura que las soluciones cumplen con normativas de seguridad.
   - Menciona las medidas de protección implementadas.
   - Ofrece más información en una reunión.

6. SOLICITUD DE DEMO:
   - Confirma la posibilidad de una demo.
   - Sugiere agendar una cita para coordinarla.

**Al confirmar citas devuelve JSON exactamente así:**
Cita confirmada:
{
  "nombre": "",
  "apellidos": "",
  "correo": "",
  "fecha": "",
  "hora": "",
  "empresa": ""
}

Al recibir datos adicionales (parciales o preferencias), responde así:
Datos adicionales recibidos:
{
  "marca": "Toyota",
  "modelo": "Corolla",
  "placa": "ABC-123",
  "color": "Rojo"
}
`.trim();

  const messagesForOpenAI = [
    { role: "system", content: systemPrompt },
    ...state.messages,
    { role: "user", content: message }
  ];

  const response = await getOpenAIResponse(messagesForOpenAI);
  const cleanResponse = response.trim();

  state.messages.push({ role: "user", content: message });
  state.messages.push({ role: "assistant", content: cleanResponse });
  if (state.messages.length > 10) state.messages = state.messages.slice(-10);

  if (cleanResponse.includes("Cita confirmada:")) {
    const citaRegex = /Cita confirmada:\s*(\{[\s\S]*?\})/;
    const matchCita = cleanResponse.match(citaRegex);

    if (matchCita) {
      const datosCita = JSON.parse(matchCita[1]);

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

      await guardarCita({
        cliente_id: clienteId,
        asesor_id: datosCita.asesorId || 1,
        tiporeunion_id: 1,
        fecha_reunion: datosCita.fecha,
        hora_reunion: datosCita.hora,
        direccion: datosCita.tienda || 'Lima'
      });

      state.datosCita = {};
    }
  }

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
