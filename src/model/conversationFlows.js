/**
 * Modelo que contiene los flujos de conversación para el asistente virtual Valeria
 * Siguiendo el patrón MVC, este archivo contiene la lógica de negocio relacionada con los flujos de conversación
 */

const conversationFlows = {
  SALUDO_INICIAL: {
    id: 1,
    name: 'SALUDO INICIAL',
    instructions: [
      'Si el cliente saluda, preséntate como Valeria y pregunta su nombre.',
      'Si el cliente proporciona su nombre, usa ese nombre en tus respuestas.',
      'Si el cliente no desea dar su nombre, continúa sin problema.'
    ]
  },
  CONSULTA_SERVICIOS_PRECIOS: {
    id: 2,
    name: 'CONSULTA SOBRE SERVICIOS Y PRECIOS',
    instructions: [
      'Presenta los servicios de Novaly con sus emojis correspondientes.',
      'Menciona que los precios dependen del nivel de personalización.',
      'Ofrece agendar una reunión para analizar opciones.'
    ]
  },
  CONSULTA_ESPECIFICA_PRECIOS: {
    id: 3,
    name: 'CONSULTA ESPECÍFICA DE PRECIOS',
    instructions: [
      'Menciona las opciones modulares desde 59 dólares mensuales.',
      'Explica que hay opciones personalizadas según necesidades.',
      'Sugiere agendar una reunión para cotización precisa.'
    ]
  },
  CONSULTA_SERVICIOS_ESPECIFICOS: {
    id: 4,
    name: 'CONSULTA SOBRE SERVICIOS ESPECÍFICOS',
    instructions: [
      'Proporciona detalles sobre el servicio consultado.',
      'Explica los beneficios (centralización, reducción de tiempo, etc).',
      'Menciona casos de éxito si es relevante.'
    ]
  },
  CONSULTA_SEGURIDAD: {
    id: 5,
    name: 'CONSULTA SOBRE SEGURIDAD',
    instructions: [
      'Asegura que las soluciones cumplen con normativas de seguridad.',
      'Menciona las medidas de protección implementadas.',
      'Ofrece más información en una reunión.'
    ]
  },
  SOLICITUD_DEMO: {
    id: 6,
    name: 'SOLICITUD DE DEMO',
    instructions: [
      'Confirma la posibilidad de una demo.',
      'Sugiere agendar una cita para coordinarla.'
    ]
  },
  TIPO_REUNION: {
    id: 7,
    name: 'TIPO DE REUNIÓN',
    instructions: [
      'Cuando el cliente solicite agendar una cita o reunión, pregunta si prefiere virtual o presencial.',
      'Usa el formato: "¡Claro [Nombre del cliente]! Podemos agendar una reunión virtual o una presencial."',
      'Incluye la nota: "📌 Importante: ✔️ Las reuniones presenciales solo están disponibles en Lima y en las oficinas del cliente."',
      'Finaliza con: "🔹 ¿Cuál prefieres?"',
      'Captura la respuesta del cliente para determinar el tipo de reunión (virtual=1, presencial=2).'
    ]
  },
  REUNION_VIRTUAL_HORARIO: {
    id: 8,
    name: 'HORARIO REUNIÓN VIRTUAL',
    instructions: [
      'Cuando el cliente elija reunión virtual, muestra el horario de atención.',
      'Usa el formato: "Perfecto. Nuestro horario de atención es de lunes a viernes de 9:00 a.m. a 6:00 p.m."',
      'Continúa solicitando los datos necesarios para la cita (fecha, hora, etc).',
      'Asegúrate de que la fecha y hora seleccionadas estén dentro del horario de atención.'
    ]
  }
};

/**
 * Función para generar el texto de los flujos de conversación para el prompt del sistema
 * @returns {string} Texto formateado con los flujos de conversación
 */
function getConversationFlowsText() {
  let flowsText = '**Flujos de conversación:**\n\n';
  
  Object.values(conversationFlows).forEach(flow => {
    flowsText += `${flow.id}. ${flow.name}:\n`;
    flow.instructions.forEach(instruction => {
      flowsText += `   - ${instruction}\n`;
    });
    flowsText += '\n';
  });
  
  return flowsText.trim();
}

module.exports = {
  conversationFlows,
  getConversationFlowsText
};