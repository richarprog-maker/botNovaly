const { getConnection } = require('../.././../config/dbConnection');
const axios = require('axios');
require('dotenv').config();


function formatearFecha(fechaStr) {
  if (!fechaStr) return 'No especificada';
  
  try {
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return fechaStr;
  }
}


function formatearHora(horaStr) {
  if (!horaStr) return 'No especificada';
  
  try {
    // Extraer solo la parte de HH:MM si viene con segundos
    const horaMinutos = horaStr.split(':').slice(0, 2).join(':');
    
    // Convertir a objeto Date para facilitar la conversión
    const fecha = new Date();
    const [horas, minutos] = horaMinutos.split(':');
    fecha.setHours(parseInt(horas, 10), parseInt(minutos, 10), 0);
    
    // Formatear a 12h
    let hora12 = fecha.getHours() % 12;
    hora12 = hora12 === 0 ? 12 : hora12; // Convertir 0 a 12 para mediodía/medianoche
    const ampm = fecha.getHours() >= 12 ? 'PM' : 'AM';
    
    return `${hora12}:${minutos.padStart(2, '0')} ${ampm}`;
  } catch (error) {
    console.error('Error al formatear hora:', error);
    return horaStr;
  }
}

/**
 * Genera el contenido del mensaje de recordatorio para una cita
 * @param {Object} datosCita - Datos de la cita
 * @param {Object} datosCliente - Datos del cliente
 * @param {string} tiempoAntes - Texto que indica cuánto tiempo falta para la cita ("una hora" o "5 minutos")
 * @returns {string} Contenido del mensaje de WhatsApp
 */
function generarContenidoRecordatorio(datosCita, datosCliente, tiempoAntes) {
  const tipoReunion = datosCita.tiporeunion_id === 1 ? 'Virtual' : 'Presencial';
  const direccion = datosCita.direccion || 'No especificada';
  
  // Formatear fecha y hora
  const fechaFormateada = formatearFecha(datosCita.fecha_reunion);
  const horaFormateada = formatearHora(datosCita.hora_reunion);
  
  return `Hola ${datosCliente.nombre_cliente} 👋

Te recordamos que tienes una cita programada en ${tiempoAntes}. Aquí están los detalles:

📅 Fecha: ${fechaFormateada}
⏰ Hora: ${horaFormateada}
📍 Modalidad: ${tipoReunion}
${tipoReunion === 'Presencial' ? `✅ Dirección: ${direccion}` : ''}

Estamos ansiosos por atenderte. Si necesitas hacer algún cambio, por favor contáctanos lo antes posible.`;
}


async function enviarRecordatorioCita(datosCita, datosCliente, tiempoAntes) {
  try {
    // Generar el contenido del mensaje
    const mensaje = generarContenidoRecordatorio(datosCita, datosCliente, tiempoAntes);
    
    // Formatear el número de teléfono (eliminar el prefijo '+' si existe)
    const telefono = datosCliente.telefono_cliente.replace(/^\+/, '');
    
    // Enviar el mensaje usando el endpoint existente
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3006';
    const response = await axios.post(`${baseURL}/send-message-bot`, {
      numero: telefono,
      texto: mensaje
    });
    
    console.log(`Recordatorio de cita enviado exitosamente al cliente ${datosCliente.nombre_cliente}`);
    return {
      success: true,
      message: `Recordatorio enviado exitosamente al cliente ${datosCliente.nombre_cliente}`
    };
  } catch (error) {
    console.error(`Error al enviar recordatorio al cliente ${datosCliente.nombre_cliente}:`, error.message);
    return {
      success: false,
      message: `No se pudo enviar el recordatorio al cliente. Error: ${error.message}`
    };
  }
}


// Objeto para almacenar las citas a las que ya se les ha enviado recordatorio
// La clave es cita_id + minutosAntes (para diferenciar entre recordatorios de 60 y 5 minutos)
const recordatoriosEnviados = {};

async function obtenerCitasParaRecordatorio(minutosAntes) {
  let connection;
  try {
    connection = await getConnection();
    
    // Calcular la fecha y hora actual completa
    const ahora = new Date();
    const fechaHoy = ahora.toISOString().split('T')[0]; // YYYY-MM-DD
    const horaActual = ahora.toTimeString().split(' ')[0]; // HH:MM:SS
    

    const horaPartes = horaActual.split(':');
    const minutosActuales = parseInt(horaPartes[0]) * 60 + parseInt(horaPartes[1]);
    
    console.log(`Verificando citas para recordatorio a las ${horaActual} (${minutosActuales} minutos desde medianoche), buscando citas que empiezan en ${minutosAntes} minutos`);
    

    const query = `
      SELECT c.*, cl.nombre_cliente, cl.correo_cliente, cl.nombre_empresa, cl.telefono_cliente
      FROM tbl_citas c
      JOIN tbl_clientes cl ON c.cliente_id = cl.cliente_id
      WHERE (c.estado = 'pendiente' OR c.estado = 'reagendada')
      AND c.fecha_reunion = ?
    `;

    const [rows] = await connection.query(query, [fechaHoy]);
    
    console.log(`Se encontraron ${rows.length} citas pendientes para hoy`);
    
    // Filtrar las citas que están exactamente a 'minutosAntes' minutos de la hora actual
    const citasFiltradas = rows.filter(cita => {
      const horaReunionPartes = cita.hora_reunion.split(':');
      const minutosReunion = parseInt(horaReunionPartes[0]) * 60 + parseInt(horaReunionPartes[1]);
      const diferencia = minutosReunion - minutosActuales;
      
      // Crear una clave única para esta cita y tipo de recordatorio
      const citaKey = `${cita.cita_id}_${minutosAntes}`;
      
      console.log(`Cita ID ${cita.cita_id}: Hora reunión: ${cita.hora_reunion} (${minutosReunion} min), ` +
                 `Hora actual: ${horaActual} (${minutosActuales} min), Diferencia: ${diferencia} min`);
      
      // Verificar si la cita está en el rango correcto Y no se ha enviado recordatorio aún
      return diferencia >= minutosAntes-0.5 && diferencia <= minutosAntes+0.5 && !recordatoriosEnviados[citaKey];
    });
    
    console.log(`De las ${rows.length} citas pendientes, ${citasFiltradas.length} cumplen con el criterio de estar a ${minutosAntes} minutos de la hora actual`);
    return citasFiltradas;
  } catch (error) {
    console.error("Error al obtener citas para recordatorio:", error);
    return [];
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexión liberada en obtenerCitasParaRecordatorio");
      } catch (releaseError) {
        console.error("Error al liberar conexión en obtenerCitasParaRecordatorio:", releaseError);
      }
    }
  }
}

async function procesarRecordatoriosCitas(minutosAntes, mensajeRecordatorio) {
  try {
    // Obtener citas que necesitan recordatorio
    const citasProximas = await obtenerCitasParaRecordatorio(minutosAntes);
    
    if (citasProximas.length === 0) {
      // console.log(`No hay citas próximas para enviar recordatorios de ${mensajeRecordatorio}.`);
      return {
        success: true,
        message: `No hay citas próximas para enviar recordatorios de ${mensajeRecordatorio}.`,
        recordatoriosEnviados: 0
      };
    }
    
    // Enviar recordatorios a cada cliente
    const resultados = [];
    let recordatoriosExitosos = 0;
    
    for (const cita of citasProximas) {
      const resultado = await enviarRecordatorioCita(
        cita,
        {
          nombre_cliente: cita.nombre_cliente,
          correo_cliente: cita.correo_cliente,
          nombre_empresa: cita.nombre_empresa,
          telefono_cliente: cita.telefono_cliente
        },
        mensajeRecordatorio
      );
      
      resultados.push({
        cita_id: cita.cita_id,
        cliente: cita.nombre_cliente,
        success: resultado.success,
        message: resultado.message
      });
      
      if (resultado.success) {
        // Marcar esta cita como procesada para este tipo de recordatorio
        const citaKey = `${cita.cita_id}_${minutosAntes}`;
        recordatoriosEnviados[citaKey] = true;
        recordatoriosExitosos++;
      }
    }
    
    return {
      success: recordatoriosExitosos > 0,
      message: `Se procesaron ${citasProximas.length} recordatorios de ${mensajeRecordatorio}, ${recordatoriosExitosos} enviados exitosamente.`,
      recordatoriosEnviados: recordatoriosExitosos,
      resultados: resultados
    };
  } catch (error) {
    // console.error(`Error al procesar recordatorios de ${mensajeRecordatorio}:`, error.message);
    return {
      success: false,
      message: `Error al procesar recordatorios de ${mensajeRecordatorio}: ${error.message}`,
      recordatoriosEnviados: 0
    };
  }
}


function iniciarServicioRecordatorios() {
  console.log("Iniciando servicio de recordatorios de citas...");
  
  // Programar recordatorios de 1 hora antes
  setInterval(async () => {
    // console.log("Verificando citas para recordatorios de una hora...");
    await procesarRecordatoriosCitas(60, "una hora");
  }, 5 * 60 * 1000); // Verificar cada 5 minutos
  
  // Programar recordatorios de 5 minutos antes
   setInterval(async () => {
  //   console.log("Verificando citas para recordatorios de 5 minutos...");
    await procesarRecordatoriosCitas(5, "5 minutos");
  }, 1 * 60 * 1000); // Verificar cada minuto
  
  return {
    success: true,
    message: "Servicio de recordatorios de citas iniciado exitosamente."
  };
}

module.exports = {
  iniciarServicioRecordatorios,
  procesarRecordatoriosCitas,
  enviarRecordatorioCita
};