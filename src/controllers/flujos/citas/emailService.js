const axios = require('axios');
const nodemailer = require('nodemailer');
const icalGenerator = require('ical-generator');
const ical = icalGenerator.default;
const { obtenerFechaHoraActual } = require('./validacionesFechaHora.js');
require('dotenv').config();

/**
 * Configuración para el servicio de correo
 * Estas variables deben estar definidas en el archivo .env
 */
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER; 

/**
 * Crea un transporter de Nodemailer para enviar correos
 * @returns {Object} Transporter de Nodemailer
 */
function crearTransporterEmail() {
  try {
    // Verificar si tenemos las credenciales necesarias
    if (!EMAIL_USER) {
      throw new Error("Falta configurar EMAIL_USER en el archivo .env");
    }
    
    // Configurar el transporter
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465, // true para 465, false para otros puertos
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      },
      tls: {
        // No fallar en certificados inválidos
        rejectUnauthorized: false
      }
    });
    
    // Verificar la conexión antes de devolver el transporter
    return transporter;
  } catch (error) {
    console.error("Error al crear transporter de email:", error.message);
    // En lugar de lanzar un error, devolvemos null y manejamos este caso en las funciones que lo usan
    return null;
  }
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
    const fechaHora = `${datosCita.fecha_reunion}T${datosCita.hora_reunion}`;
    const fechaInicio = new Date(fechaHora);
    const fechaFin = new Date(fechaInicio.getTime() + 60 * 60 * 1000); // 1 hora después
    
    // Determinar si es reunión virtual o presencial
    const esReunionVirtual = datosCita.tiporeunion_id === 1;
    
    // Crear un ID único para el evento
    const eventoId = `cita-${Date.now()}`;
    
    // Crear el evento de calendario con ical-generator
    const calendar = ical({name: 'Calendario de Citas'});
    const evento = calendar.createEvent({
      id: eventoId,
      start: fechaInicio,
      end: fechaFin,
      summary: `Reunión con ${datosCliente.nombre_cliente} - ${datosCliente.nombre_empresa || 'Cliente'}`,
      description: generarContenidoCorreo(datosCita, datosCliente, datosAsesor, esReunionVirtual),
      location: esReunionVirtual ? 'Reunión Virtual' : datosCita.direccion,
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
    
    // Configurar el transporter de email
    const transporter = crearTransporterEmail();
    
    // Verificar si el transporter se creó correctamente
    if (!transporter) {
      console.error("No se pudo crear el transporter de email");
      return {
        success: false,
        message: "No se pudo configurar el servicio de correo. Por favor, verifique las credenciales."
      };
    }
    
    // Crear enlace de reunión virtual (simulado)
    const enlaceReunion = esReunionVirtual ? 
      `https://meet.jit.si/${eventoId}` : null;
    
    // Enviar correo con la invitación
    const mailOptions = {
      from: `"${datosAsesor.nombre_asesor}" <${EMAIL_FROM}>`,
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
    
    // Configurar el transporter de email
    const transporter = crearTransporterEmail();
    
    // Verificar si el transporter se creó correctamente
    if (!transporter) {
      console.error("No se pudo crear el transporter de email");
      return {
        success: false,
        message: "No se pudo configurar el servicio de correo. Por favor, verifique las credenciales."
      };
    }
    
    // Crear opciones del correo
    const mailOptions = {
      from: `"${datosAsesor.nombre_asesor}" <${EMAIL_FROM}>`,
      to: [datosCliente.correo_cliente, datosAsesor.correo_asesor],
      subject: `Confirmación de cita - ${datosCliente.nombre_cliente}`,
      html: generarContenidoCorreo(datosCita, datosCliente, datosAsesor, esReunionVirtual)
    };
    
    // Enviar correo usando Nodemailer
    const info = await transporter.sendMail(mailOptions);

    console.log("Correo de confirmación enviado exitosamente:", info.messageId);
    return {
      success: true,
      message: "Correo de confirmación enviado exitosamente"
    };
  } catch (error) {
    console.error("Error al enviar correo de confirmación:", error.message);
    return {
      success: false,
      message: "No se pudo enviar el correo de confirmación. Por favor, intente más tarde."
    };
  }
}

module.exports = {
  crearReunionYEnviarInvitacion,
  enviarCorreoConfirmacion
};