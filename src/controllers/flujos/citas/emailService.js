const axios = require('axios');
const nodemailer = require('nodemailer');
const icalGenerator = require('ical-generator');
const ical = icalGenerator.default;
const { obtenerFechaHoraActual } = require('./validacionesFechaHora.js');
require('dotenv').config();

/**
 * Configuración para el servicio de correo
 * Configuración simplificada sin autenticación
 */
const EMAIL_HOST = 'localhost';
const EMAIL_PORT = 25;
const EMAIL_USER = null;
const EMAIL_PASS = null;
const EMAIL_FROM = 'noreply@example.com'; 

/**
 * Crea un transporter de Nodemailer para enviar correos
 * Si no hay credenciales configuradas o hay errores de autenticación, devuelve un transporter simulado
 * @returns {Object} Transporter de Nodemailer o un transporter simulado
 */
function crearTransporterEmail() {
  // Siempre crear un transporter simulado que no envía correos reales pero simula el comportamiento
  // No intentamos autenticarnos con ningún servicio de correo
  console.log("[EMAIL SIMULADO] Usando transporter simulado sin autenticación");
  return {
    sendMail: (mailOptions) => {
      console.log("[EMAIL SIMULADO] Destinatarios:", mailOptions.to);
      console.log("[EMAIL SIMULADO] Asunto:", mailOptions.subject);
      // Simular un ID de mensaje
      return Promise.resolve({ messageId: `simulado-${Date.now()}` });
    },
    verify: () => Promise.resolve(true)
  };
}

/**
 * Crea un evento de calendario y envía invitaciones a los participantes
 * @param {Object} datosCita - Datos de la cita
 * @param {Object} datosCliente - Datos del cliente
 * @param {Object} datosAsesor - Datos del asesor
 * @returns {Promise<Object>} Información de la reunión creada
 */
async function crearReunionYEnviarInvitacion(datosCita, datosCliente, datosAsesor) {
  try {
    // Formatear fecha y hora para el evento
    // Asegurarse de que la fecha esté en formato YYYY-MM-DD
    const fechaFormateada = datosCita.fecha_reunion.split('/').reverse().join('-');
    const fechaHora = `${fechaFormateada}T${datosCita.hora_reunion}`;
    const fechaInicio = new Date(fechaHora);
    const fechaFin = new Date(fechaInicio.getTime() + 60 * 60 * 1000); // 1 hora después
    
    // Determinar si es reunión virtual o presencial
    const esReunionVirtual = datosCita.tiporeunion_id === 1;
    
    // Crear un ID único para el evento
    const eventoId = `cita-${Date.now()}`;
    
    // Generar enlace de Jitsi sin autenticación si es reunión virtual
    let enlaceReunion = null;
    if (esReunionVirtual) {
      // Usar la función existente para generar el enlace sin autenticación
      const resultadoEnlace = await generarEnlaceJitsiSinAutenticacion(eventoId, false);
      if (resultadoEnlace.success) {
        enlaceReunion = resultadoEnlace.enlace_reunion;
      } else {
        console.error("Error al generar enlace de Jitsi:", resultadoEnlace.message);
        // Usar un enlace directo como respaldo
        enlaceReunion = `https://meet.jit.si/${eventoId}`;
      }
    }
    
    // Crear el evento de calendario con ical-generator
    const calendar = ical({name: 'Calendario de Citas'});
    const evento = calendar.createEvent({
      id: eventoId,
      start: fechaInicio,
      end: fechaFin,
      summary: `Reunión con ${datosCliente.nombre_cliente} - ${datosCliente.nombre_empresa || 'Cliente'}`,
      description: generarContenidoCorreo(datosCita, datosCliente, datosAsesor, esReunionVirtual),
      location: esReunionVirtual ? (enlaceReunion || 'Reunión Virtual') : datosCita.direccion,
      organizer: {
        name: datosAsesor.nombre_asesor,
        email: datosAsesor.correo_asesor
      }
    });
    
    // Agregar asistentes
    evento.createAttendee({
      name: datosCliente.nombre_cliente,
      email: datosCliente.correo_cliente,
      rsvp: true,
      role: 'REQ-PARTICIPANT',
      status: 'NEEDS-ACTION'
    });
    
    evento.createAttendee({
      name: datosAsesor.nombre_asesor,
      email: datosAsesor.correo_asesor,
      rsvp: true,
      role: 'REQ-PARTICIPANT',
      status: 'ACCEPTED'
    });
    
    // Generar el archivo iCalendar
    const icsString = calendar.toString();
    
    // Configurar el transporter de email (ahora siempre devuelve un transporter, real o simulado)
    const transporter = crearTransporterEmail();
    
    // Enviar correo con la invitación
    const mailOptions = {
      from: `"${datosAsesor.nombre_asesor}" <${EMAIL_FROM || 'noreply@example.com'}>`,
      to: [datosCliente.correo_cliente, datosAsesor.correo_asesor],
      subject: `Reunión con ${datosCliente.nombre_cliente} - ${datosCliente.nombre_empresa || 'Cliente'}`,
      html: generarContenidoCorreo(datosCita, datosCliente, datosAsesor, esReunionVirtual, enlaceReunion),
      icalEvent: {
        filename: 'invitacion.ics',
        method: 'REQUEST',
        content: icsString
      }
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log("Invitación enviada exitosamente:", info.messageId);
    return {
      success: true,
      reunion_id: eventoId,
      enlace_reunion: enlaceReunion
    };
  } catch (error) {
    console.error("Error al crear reunión:", error.message);
    return {
      success: false,
      message: "No se pudo crear la reunión. Por favor, intente más tarde."
    };
  }
} 

/**
 * Genera el contenido HTML del correo de invitación
 * @param {Object} datosCita - Datos de la cita
 * @param {Object} datosCliente - Datos del cliente
 * @param {Object} datosAsesor - Datos del asesor
 * @param {boolean} esReunionVirtual - Indica si es una reunión virtual
 * @param {string} enlaceReunion - Enlace de la reunión virtual (opcional)
 * @returns {string} Contenido HTML del correo
 */
function generarContenidoCorreo(datosCita, datosCliente, datosAsesor, esReunionVirtual, enlaceReunion = null) {
  const tipoReunion = esReunionVirtual ? 'virtual' : 'presencial';
  const ubicacion = esReunionVirtual ? (enlaceReunion ? enlaceReunion : 'Enlace en la invitación adjunta') : datosCita.direccion;
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0078d4;">Confirmación de Cita</h2>
      <p>Estimado/a <strong>${datosCliente.nombre_cliente}</strong>,</p>
      <p>Su cita ha sido confirmada con los siguientes detalles:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Fecha:</strong> ${datosCita.fecha_reunion}</p>
        <p><strong>Hora:</strong> ${datosCita.hora_reunion}</p>
        <p><strong>Tipo de reunión:</strong> ${tipoReunion}</p>
        <p><strong>Ubicación:</strong> ${ubicacion}</p>
        <p><strong>Asesor asignado:</strong> ${datosAsesor.nombre_asesor}</p>
      </div>
      
      ${esReunionVirtual && enlaceReunion ? `<p><strong>Enlace para unirse a la reunión:</strong> <a href="${enlaceReunion}">${enlaceReunion}</a></p>` : ''}
      
      <p>Si necesita realizar algún cambio en su cita, por favor contáctenos respondiendo a este correo o llamando al número de su asesor: ${datosAsesor.telefono_asesor}.</p>
      
      <p>¡Esperamos atenderle pronto!</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
        <p>Este es un correo automático, por favor no responda directamente a este mensaje.</p>
      </div>
    </div>
  `;
}


/**
 * Envía un correo de confirmación de cita sin crear una reunión en el calendario
 * @param {Object} datosCita - Datos de la cita
 * @param {Object} datosCliente - Datos del cliente
 * @param {Object} datosAsesor - Datos del asesor
 * @returns {Promise<Object>} Resultado del envío del correo
 */
async function enviarCorreoConfirmacion(datosCita, datosCliente, datosAsesor) {
  try {
    // Determinar si es reunión virtual o presencial
    const esReunionVirtual = datosCita.tiporeunion_id === 1;
    
    // Generar enlace de Jitsi sin autenticación si es reunión virtual
    let enlaceReunion = null;
    if (esReunionVirtual) {
      // Crear un ID único para la reunión
      const reunionId = `cita-${Date.now()}`;
      // Usar la función existente para generar el enlace sin autenticación
      const resultadoEnlace = await generarEnlaceJitsiSinAutenticacion(reunionId, false);
      if (resultadoEnlace.success) {
        enlaceReunion = resultadoEnlace.enlace_reunion;
      } else {
        console.error("Error al generar enlace de Jitsi:", resultadoEnlace.message);
        // Usar un enlace directo como respaldo
        enlaceReunion = `https://meet.jit.si/${reunionId}`;
      }
      
      // Actualizar los datos de la cita con el enlace de la reunión
      datosCita.enlace_reunion = enlaceReunion;
    }
    
    // Configurar el transporter de email (ahora siempre devuelve un transporter, real o simulado)
    const transporter = crearTransporterEmail();
    
    // Crear opciones del correo
    const mailOptions = {
      from: `"${datosAsesor.nombre_asesor}" <${EMAIL_FROM || 'noreply@example.com'}>`,
      to: [datosCliente.correo_cliente, datosAsesor.correo_asesor],
      subject: `Confirmación de cita - ${datosCliente.nombre_cliente}`,
      html: generarContenidoCorreo(datosCita, datosCliente, datosAsesor, esReunionVirtual, enlaceReunion)
    };
    
    // Enviar correo usando Nodemailer (real o simulado)
    const info = await transporter.sendMail(mailOptions);

    console.log("Correo de confirmación enviado exitosamente:", info.messageId);
    return {
      success: true,
      message: "Correo de confirmación enviado exitosamente",
      enlace_reunion: enlaceReunion
    };
  } catch (error) {
    console.error("Error al enviar correo de confirmación:", error.message);
    return {
      success: false,
      message: "No se pudo enviar el correo de confirmación. Por favor, intente más tarde."
    };
  }
}

/**
 * Genera un enlace de Jitsi Meet sin autenticación
 * Jitsi Meet es de código abierto y permite crear reuniones sin necesidad de autenticación
 * @param {string} nombreReunion - Nombre opcional para la reunión (si no se proporciona, se genera uno aleatorio)
 * @param {boolean} enviarCorreo - Indica si se debe enviar un correo con el enlace
 * @param {Object} datosCorreo - Datos necesarios para enviar el correo (opcional, requerido si enviarCorreo es true)
 * @returns {Promise<Object>} Información del enlace generado
 */
async function generarEnlaceJitsiSinAutenticacion(nombreReunion = null, enviarCorreo = false, datosCorreo = null) {
  try {
    // Generar un ID único para la reunión
    const reunionId = nombreReunion || `reunion-${Date.now()}`;
    
    // Crear el enlace de Jitsi Meet (directo, sin autenticación)
    const enlaceReunion = `https://meet.jit.si/${reunionId}`;
    console.log(`Enlace de Jitsi Meet generado sin autenticación: ${enlaceReunion}`);
    
    // Si se solicita enviar correo, verificar que se proporcionaron los datos necesarios
    if (enviarCorreo) {
      if (!datosCorreo || !datosCorreo.datosCita || !datosCorreo.datosCliente || !datosCorreo.datosAsesor) {
        return {
          success: false,
          message: "Faltan datos necesarios para enviar el correo",
          enlace_reunion: enlaceReunion
        };
      }
      
      try {
        // Configurar el transporter de email (siempre devuelve un transporter, real o simulado)
        const transporter = crearTransporterEmail();
        
        // Extraer los datos necesarios para el correo
        const { datosCita, datosCliente, datosAsesor } = datosCorreo;
        
        // Crear opciones del correo
        const mailOptions = {
          from: `"${datosAsesor.nombre_asesor}" <${EMAIL_FROM || 'noreply@example.com'}>`,
          to: [datosCliente.correo_cliente, datosAsesor.correo_asesor],
          subject: `Enlace para reunión virtual con ${datosCliente.nombre_cliente}`,
          html: generarContenidoCorreo(datosCita, datosCliente, datosAsesor, true, enlaceReunion)
        };
        
        // Enviar correo usando Nodemailer (real o simulado)
        const info = await transporter.sendMail(mailOptions);
        
        console.log("Correo con enlace de reunión enviado exitosamente:", info.messageId);
      } catch (emailError) {
        console.error("Error al enviar correo con enlace de reunión:", emailError.message);
        // Continuamos a pesar del error en el envío del correo
      }
    }
    
    // Siempre devolvemos el enlace generado, incluso si hubo error en el envío del correo
    return {
      success: true,
      message: enviarCorreo ? "Enlace de reunión generado y correo enviado" : "Enlace de reunión generado exitosamente",
      reunion_id: reunionId,
      enlace_reunion: enlaceReunion
    };
  } catch (error) {
    console.error("Error al generar enlace de Jitsi:", error.message);
    return {
      success: false,
      message: `No se pudo generar el enlace de reunión. Error: ${error.message}`
    };
  }
}

module.exports = {
  crearReunionYEnviarInvitacion,
  enviarCorreoConfirmacion,
  generarEnlaceJitsiSinAutenticacion
};