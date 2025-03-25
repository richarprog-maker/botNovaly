const { obtenerDetallesUltimaCita } = require('./db/ultimasCitas.js');
const { getConnection } = require('../../../config/dbConnection');
const { determinarTipoReunionId } = require('./flujoCitas.js');



async function actualizarCita(citaId, datosCita) {
  let connection;
  try {
    // Validar y formatear fecha y hora antes de guardar
    let fechaReunion = datosCita.fecha_reunion;
    let horaReunion = datosCita.hora_reunion;
    
    // Validar formato de fecha (debe ser YYYY-MM-DD para MySQL)
    if (typeof fechaReunion === 'string' && !fechaReunion.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.log(`Formato de fecha incorrecto: ${fechaReunion}, intentando convertir...`);
      // Intentar convertir formatos comunes (DD/MM/YYYY, DD-MM-YYYY) a YYYY-MM-DD
      try {
        const partesFecha = fechaReunion.split(/[\/\-\.]/); // Separar por /, - o .
        if (partesFecha.length === 3) {
          // Asumir formato DD/MM/YYYY si el primer número es <= 31
          if (parseInt(partesFecha[0]) <= 31 && parseInt(partesFecha[1]) <= 12) {
            fechaReunion = `${partesFecha[2].padStart(4, '20')}-${partesFecha[1].padStart(2, '0')}-${partesFecha[0].padStart(2, '0')}`;
            console.log(`Fecha convertida a: ${fechaReunion}`);
          }
        }
      } catch (error) {
        console.error("Error al convertir formato de fecha:", error);
        return { success: false, message: "El formato de la fecha no es válido. Debe ser DD/MM/YYYY o YYYY-MM-DD." };
      }
    }
    
    // Validar formato de hora (debe ser HH:MM:SS para MySQL)
    if (typeof horaReunion === 'string') {
      if (!horaReunion.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
        console.log(`Formato de hora incorrecto: ${horaReunion}, intentando convertir...`);
        // Intentar extraer horas y minutos de formatos comunes
        try {
          const coincidencia = horaReunion.match(/(\d{1,2})\s*[:\.\h]\s*(\d{2})/i);
          if (coincidencia) {
            const horas = coincidencia[1].padStart(2, '0');
            const minutos = coincidencia[2];
            horaReunion = `${horas}:${minutos}:00`;
            console.log(`Hora convertida a: ${horaReunion}`);
          } else {
            return { success: false, message: "El formato de la hora no es válido. Debe ser HH:MM." };
          }
        } catch (error) {
          console.error("Error al convertir formato de hora:", error);
          return { success: false, message: "El formato de la hora no es válido. Debe ser HH:MM." };
        }
      } else if (horaReunion.match(/^\d{1,2}:\d{2}$/)) {
        // Si solo tiene HH:MM, añadir los segundos
        horaReunion = `${horaReunion}:00`;
        console.log(`Hora completada a: ${horaReunion}`);
      }
    }
    
    console.log(`Actualizando cita ${citaId} con fecha: ${fechaReunion} y hora: ${horaReunion}`);
    
    connection = await getConnection();
    
    // Construir la consulta de actualización dinámicamente
    let query = 'UPDATE tbl_citas SET ';
    const params = [];
    const updates = [];
    
    if (fechaReunion) {
      updates.push('fecha_reunion = ?');
      params.push(fechaReunion);
    }
    
    if (horaReunion) {
      updates.push('hora_reunion = ?');
      params.push(horaReunion);
    }
    
    if (datosCita.tiporeunion_id) {
      updates.push('tiporeunion_id = ?');
      params.push(datosCita.tiporeunion_id);
    }
    
    if (datosCita.direccion) {
      updates.push('direccion = ?');
      params.push(datosCita.direccion);
    }
    
    if (datosCita.asesor_id) {
      updates.push('asesor_id = ?');
      params.push(datosCita.asesor_id);
    }
    
    // Si no hay nada que actualizar, retornar
    if (updates.length === 0) {
      return { success: false, message: "No se proporcionaron datos para actualizar la cita." };
    }
    
    query += updates.join(', ') + ' WHERE cita_id = ?';
    params.push(citaId);
    
    const [result] = await connection.query(query, params);
    
    return result.affectedRows > 0
      ? { success: true, message: "¡Cita reagendada exitosamente!" }
      : { success: false, message: "No se pudo actualizar la cita. Verifica que el ID sea correcto." };
  } catch (error) {
    console.error("Error en actualizarCita:", error);
    return { success: false, message: `Error al actualizar la cita: ${error.message}` };
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexión liberada en actualizarCita");
      } catch (releaseError) {
        console.error("Error al liberar conexión en actualizarCita:", releaseError);
      }
    }
  }
}


async function procesarReagendamientoOpenAI(response, state, sender) {
  try {
    let cleanResponse = response.trim();
    const reagendamientoMarker = "===REAGENDAMIENTO_JSON===";
    const reagendamientoIndex = cleanResponse.indexOf(reagendamientoMarker);
    
    // Si no hay marcador de reagendamiento, devolver la respuesta sin procesar
    if (reagendamientoIndex === -1) {
      return cleanResponse;
    }

    const jsonStart = reagendamientoIndex + reagendamientoMarker.length;
    const jsonString = cleanResponse.substring(jsonStart).trim();
    
    try {
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No se encontró un objeto JSON válido");
      }
      
      const datosReagendamiento = JSON.parse(jsonMatch[0]);
      
      // Obtener detalles de la última cita
      const ultimaCita = await obtenerDetallesUltimaCita(sender);
      
      if (!ultimaCita) {
        return cleanResponse.substring(0, reagendamientoIndex).trim() + 
          "\n\nNo encontramos citas previas asociadas a tu número. ¿Te gustaría agendar una nueva cita?";
      }
      
      // Preparar datos para actualización
      const tipoReunionId = datosReagendamiento.tipoReunion ? 
        determinarTipoReunionId(datosReagendamiento.tipoReunion) : 
        ultimaCita.tiporeunion_id;
      
      const datosActualizacion = {
        fecha_reunion: datosReagendamiento.fecha || ultimaCita.fecha_reunion,
        hora_reunion: datosReagendamiento.hora || ultimaCita.hora_reunion,
        tiporeunion_id: tipoReunionId,
        direccion: datosReagendamiento.direccion || ultimaCita.direccion
      };
      
      // Actualizar la cita en la base de datos
      const resultadoActualizacion = await actualizarCita(ultimaCita.cita_id, datosActualizacion);
      
      if (!resultadoActualizacion.success) {
        console.error("Error al reagendar la cita:", resultadoActualizacion.message);
        return cleanResponse.substring(0, reagendamientoIndex).trim() + 
          "\n\nLo siento, hubo un problema al reagendar tu cita: " + resultadoActualizacion.message;
      }
      
      // Formatear fecha para mostrarla en formato DD/MM/YYYY
      let fechaMostrar = datosReagendamiento.fecha || ultimaCita.fecha_reunion;
      if (fechaMostrar.includes('-')) {
        const partesFecha = fechaMostrar.split('-');
        fechaMostrar = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;
      }
      
      // Formatear hora para mostrarla en formato HH:MM
      let horaMostrar = datosReagendamiento.hora || ultimaCita.hora_reunion;
      if (horaMostrar.includes(':')) {
        horaMostrar = horaMostrar.substring(0, 5);
      }
      
      return cleanResponse.substring(0, reagendamientoIndex).trim() + 
        `\n\n¡Tu cita ha sido reagendada exitosamente para el ${fechaMostrar} a las ${horaMostrar}! Nos pondremos en contacto contigo para confirmar los detalles.`;
    } catch (error) {
      console.error("Error al parsear JSON o reagendar cita:", error);
      return cleanResponse.substring(0, reagendamientoIndex).trim() + 
        "\n\nLo siento, hubo un problema al reagendar tu cita. Por favor, intenta de nuevo más tarde.";
    }
  } catch (error) {
    console.error("Error general en procesarReagendamientoOpenAI:", error);
    return response ? response.trim() : "Lo siento, hubo un problema al procesar tu mensaje. Por favor, intenta de nuevo.";
  }
}

module.exports = {
  actualizarCita,
  procesarReagendamientoOpenAI
};