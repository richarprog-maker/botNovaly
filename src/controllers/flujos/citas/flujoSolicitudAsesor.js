const { buscarClientePorTelefono } = require('./db/buscarClientes.js');
const { obtenerAsesores } = require('./db/appointmentDB.js');
const { procesarSolicitudAsesor } = require('./solicitudAsesorService.js');

/**
 * Procesa la respuesta de OpenAI que contiene una solicitud de asesor
 * @param {string} response - Respuesta de OpenAI
 * @param {Object} state - Estado de la conversación
 * @param {string} sender - Número de teléfono del remitente
 * @returns {Promise<string>} Respuesta limpia para el usuario
 */
async function procesarSolicitudAsesorOpenAI(response, state, sender) {
  try {
    let cleanResponse = response.trim();
    const solicitudMarker = "===SOLICITUD_ASESOR_JSON===";
    const solicitudIndex = cleanResponse.indexOf(solicitudMarker);
    
    // Si no hay marcador de solicitud, devolver la respuesta sin procesar
    if (solicitudIndex === -1) {
      return cleanResponse;
    }

    const jsonStart = solicitudIndex + solicitudMarker.length;
    const jsonString = cleanResponse.substring(jsonStart).trim();
    
    try {
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No se encontró un objeto JSON válido");
      }
      
      const datosSolicitud = JSON.parse(jsonMatch[0]);
      
      // Obtener datos del cliente
      const datosCliente = await buscarClientePorTelefono(sender) || {
        nombre_cliente: 'Cliente',
        telefono_cliente: sender
      };
      
      // Preparar datos de la solicitud
      const datosSolicitudProcesada = {
        horario_contacto: datosSolicitud.horario || 'No especificado',
        fecha_solicitud: new Date().toISOString().split('T')[0],
        hora_solicitud: new Date().toTimeString().split(' ')[0].substring(0, 5)
      };
      
      try {
        // Obtener lista de asesores para notificar
        const listaAsesores = await obtenerAsesores();
        
        if (listaAsesores && listaAsesores.length > 0) {
          // Procesar la solicitud y notificar a los asesores
          const resultadoNotificacion = await procesarSolicitudAsesor(
            datosSolicitudProcesada,
            datosCliente,
            listaAsesores
          );
          
          console.log("Resultado de notificaciones de solicitud de asesor:", resultadoNotificacion.message);
        } else {
          console.log("No se encontraron asesores para notificar sobre la solicitud");
        }
      } catch (notificacionError) {
        // Solo registrar el error, no interrumpir el flujo
        console.error("Error al enviar notificaciones de solicitud de asesor:", notificacionError.message);
      }
      
      return cleanResponse.substring(0, solicitudIndex).trim() + 
        `\n\n¡Perfecto! He registrado tu solicitud. Un asesor de nuestro equipo se pondrá en contacto contigo en el horario indicado: ${datosSolicitud.horario || 'horario laboral'}.\n\n¿Hay algo más en lo que pueda ayudarte mientras tanto?`;
    } catch (error) {
      console.error("Error al parsear JSON o procesar solicitud de asesor:", error);
      return cleanResponse.substring(0, solicitudIndex).trim() + 
        "\n\nLo siento, hubo un problema al procesar tu solicitud. Por favor, intenta de nuevo más tarde.";
    }
  } catch (error) {
    console.error("Error general en procesarSolicitudAsesorOpenAI:", error);
    return response ? response.trim() : "Lo siento, hubo un problema al procesar tu mensaje. Por favor, intenta de nuevo.";
  }
}

module.exports = {
  procesarSolicitudAsesorOpenAI
};