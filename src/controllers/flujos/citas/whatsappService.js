const axios = require('axios');
require('dotenv').config();

/**
 * Genera el contenido del mensaje de WhatsApp para notificar al asesor sobre una nueva cita
 * @param {Object} datosCita - Datos de la cita
 * @param {Object} datosCliente - Datos del cliente
 * @returns {string} Contenido del mensaje de WhatsApp
 */
function generarContenidoMensaje(datosCita, datosCliente, esReagendamiento = false) {
  const tipoReunion = datosCita.tiporeunion_id === 1 ? 'Virtual' : 'Presencial';
  const direccion = datosCita.direccion || 'No especificada';
  // Verificar si existe enlace_reunion (desde flujoCitas.js) o vinculo_reunion (desde la base de datos)
  const vinculoReunion = datosCita.enlace_reunion || datosCita.vinculo_reunion || 'No disponible';
  
  // Agregar log para depuración
  console.log('Datos de la cita en generarContenidoMensaje:', JSON.stringify(datosCita, null, 2));
  console.log('Enlace de reunión a enviar:', vinculoReunion);
  
  if (esReagendamiento) {
    return `Hola 👋

Una cita ha sido reagendada. Aquí están los nuevos detalles:

👤 Cliente: ${datosCliente.nombre_cliente}
🏢 Empresa: ${datosCliente.nombre_empresa || 'No especificada'}
📅 Nueva fecha: ${datosCita.fecha_reunion}
⏰ Nueva hora: ${datosCita.hora_reunion}
📍 Modalidad: ${tipoReunion}
✉️ Correo del cliente: ${datosCliente.correo_cliente || 'No especificado'}
📞 Teléfono del cliente: ${datosCliente.telefono_cliente}
${tipoReunion === 'Presencial' ? `✅ Dirección: ${direccion}` : `🔗 Enlace de reunión: ${vinculoReunion}`}`;
  }
  
  return `Hola 👋

Se ha agendado una nueva reunión con un cliente. Aquí están los detalles:

👤 Cliente: ${datosCliente.nombre_cliente}
🏢 Empresa: ${datosCliente.nombre_empresa || 'No especificada'}
📅 Fecha: ${datosCita.fecha_reunion}
⏰ Hora: ${datosCita.hora_reunion}
📍 Modalidad: ${tipoReunion}
✉️ Correo del cliente: ${datosCliente.correo_cliente || 'No especificado'}
📞 Teléfono del cliente: ${datosCliente.telefono_cliente}
${tipoReunion === 'Presencial' ? `✅ Dirección: ${direccion}` : `🔗 Enlace de reunión: ${vinculoReunion}`}`;
}

/**
 * Envía una notificación por WhatsApp a un asesor sobre una nueva cita
 * @param {Object} datosCita - Datos de la cita
 * @param {Object} datosCliente - Datos del cliente
 * @param {Object} datosAsesor - Datos del asesor
 * @returns {Promise<Object>} Resultado del envío del mensaje
 */
async function enviarNotificacionWhatsApp(datosCita, datosCliente, datosAsesor, esReagendamiento = false) {
  try {
    // Generar el contenido del mensaje
    const mensaje = generarContenidoMensaje(datosCita, datosCliente, esReagendamiento);
    
    // Formatear el número de teléfono (eliminar el prefijo '+' si existe)
    const telefono = datosAsesor.telefono_asesor.replace(/^\+/, '');
    
    // Enviar el mensaje usando el endpoint existente
    // Usamos la URL completa del servidor en lugar de una ruta relativa
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3006';
    
    // Verificar si la URL base está configurada
    if (!process.env.API_BASE_URL) {
      console.warn('ADVERTENCIA: API_BASE_URL no está configurada en el archivo .env. Usando valor por defecto:', baseURL);
    }
    
    console.log(`Intentando enviar mensaje WhatsApp a ${telefono} usando endpoint: ${baseURL}/send-message-bot`);
    
    const response = await axios.post(`${baseURL}/send-message-bot`, {
      numero: telefono,
      texto: mensaje
    });
    
    // Verificar la respuesta
    if (response.data && response.data.success === false) {
      throw new Error(`Error del servidor de WhatsApp: ${response.data.message || 'Sin detalles'}`); 
    }
    console.log(`Notificación WhatsApp enviada exitosamente al asesor ${datosAsesor.nombre_asesor}`);
    return {
      success: true,
      message: `Notificación enviada exitosamente al asesor ${datosAsesor.nombre_asesor}`
    };
  } catch (error) {
    console.error(`Error al enviar notificación WhatsApp al asesor ${datosAsesor.nombre_asesor}:`, error.message);
    return {
      success: false,
      message: `No se pudo enviar la notificación al asesor. Error: ${error.message}`
    };
  }
}

/**
 * Envía notificaciones por WhatsApp a todos los asesores sobre una nueva cita
 * @param {Object} datosCita - Datos de la cita
 * @param {Object} datosCliente - Datos del cliente
 * @param {Array} listaAsesores - Lista de asesores a notificar
 * @returns {Promise<Object>} Resultado del envío de las notificaciones
 */
async function notificarAsesoresPorWhatsApp(datosCita, datosCliente, listaAsesores, esReagendamiento = false) {
  try {
    const resultados = [];
    
    // Enviar notificación a cada asesor en la lista
    for (const asesor of listaAsesores) {
      const resultado = await enviarNotificacionWhatsApp(datosCita, datosCliente, asesor, esReagendamiento);
      resultados.push({
        asesor_id: asesor.asesor_id,
        nombre_asesor: asesor.nombre_asesor,
        success: resultado.success,
        message: resultado.message
      });
    }
    
    // Verificar si al menos una notificación fue exitosa
    const algunaExitosa = resultados.some(r => r.success);
    
    return {
      success: algunaExitosa,
      message: algunaExitosa ? 
        "Se enviaron notificaciones a los asesores exitosamente" : 
        "No se pudo enviar ninguna notificación a los asesores",
      resultados: resultados
    };
  } catch (error) {
    console.error("Error al notificar a los asesores:", error.message);
    return {
      success: false,
      message: `Error al notificar a los asesores: ${error.message}`
    };
  }
}

module.exports = {
  enviarNotificacionWhatsApp,
  notificarAsesoresPorWhatsApp
};