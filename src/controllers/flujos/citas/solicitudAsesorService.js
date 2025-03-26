const axios = require('axios');
require('dotenv').config();



function generarContenidoMensajeSolicitud(datosSolicitud, datosCliente) {
  return `Hola 👋

Un cliente ha solicitado ser contactado por un asesor. Aquí están los detalles:

👤 Cliente: ${datosCliente.nombre_cliente || 'No especificado'}
🏢 Empresa: ${datosCliente.nombre_empresa || 'No especificada'}
📅 Horario preferido: ${datosSolicitud.horario_contacto || 'No especificado'}
✉️ Correo del cliente: ${datosCliente.correo_cliente || 'No especificado'}
📞 Teléfono del cliente: ${datosCliente.telefono_cliente}`;
}


async function enviarNotificacionSolicitudAsesor(datosSolicitud, datosCliente, datosAsesor) {
  try {
    // Generar el contenido del mensaje
    const mensaje = generarContenidoMensajeSolicitud(datosSolicitud, datosCliente);
    
    // Formatear el número de teléfono (eliminar el prefijo '+' si existe)
    const telefono = datosAsesor.telefono_asesor.replace(/^\+/, '');
    
    // Enviar el mensaje usando el endpoint existente
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3004';
    const response = await axios.post(`${baseURL}/send-message-bot`, {
      numero: telefono,
      texto: mensaje
    });
    
    console.log(`Notificación de solicitud de asesor enviada exitosamente a ${datosAsesor.nombre_asesor}`);
    return {
      success: true,
      message: `Notificación de solicitud enviada exitosamente al asesor ${datosAsesor.nombre_asesor}`
    };
  } catch (error) {
    console.error(`Error al enviar notificación de solicitud al asesor ${datosAsesor.nombre_asesor}:`, error.message);
    return {
      success: false,
      message: `No se pudo enviar la notificación al asesor. Error: ${error.message}`
    };
  }
}


async function procesarSolicitudAsesor(datosSolicitud, datosCliente, listaAsesores) {
  try {
    // Si no hay asesores disponibles, retornar error
    if (!listaAsesores || listaAsesores.length === 0) {
      return {
        success: false,
        message: "No hay asesores disponibles para procesar la solicitud"
      };
    }
    
    // Enviar notificaciones directamente a cada asesor usando enviarNotificacionSolicitudAsesor
    const resultados = [];
    
    // Enviar notificación a cada asesor en la lista
    for (const asesor of listaAsesores) {
      const resultado = await enviarNotificacionSolicitudAsesor(datosSolicitud, datosCliente, asesor);
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
    console.error("Error al procesar solicitud de asesor:", error.message);
    return {
      success: false,
      message: `Error al procesar solicitud de asesor: ${error.message}`
    };
  }
}

module.exports = {
  enviarNotificacionSolicitudAsesor,
  procesarSolicitudAsesor
};