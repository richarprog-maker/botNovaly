
const { clienteExiste, buscarClientePorTelefono } = require('./db/buscarClientes.js');
const { guardarCliente, guardarCita } = require('./db/appointmentDB.js');
const { obtenerFechaHoraActual } = require('./validacionesFechaHora.js');
const { obtenerDetallesUltimaCita } = require('./db/ultimasCitas.js');

function generarPromptDatosRegistro(clienteYaRegistrado) {
  // Si el cliente ya está registrado, solo solicitar datos de la cita
  return clienteYaRegistrado ? ` 
    Datos de la cita (cliente ya registrado):
    {
      "fecha": "",
      "hora": "",
      "tipoReunion": "",
      "direccion": ""
    }
  ` : ` 
    Datos del cliente y cita:
    {
      "nombre": "",
      "apellidos": "",
      "correo": "",
      "empresa": "",
      "fecha": "",
      "hora": "",
      "tipoReunion": "",
      "direccion": ""
    }
  `;
}

function inicializarDatosParciales(state, clienteYaRegistrado) {
  if (!state.datosParciales) {
    state.datosParciales = {
      clienteNuevo: !clienteYaRegistrado,
      datosCliente: {},
      datosCita: {}
    };
  }
}


function actualizarDatosParciales(state, datosCita, clienteYaRegistrado) {
  if (!clienteYaRegistrado) {
    state.datosParciales.datosCliente = {
      ...state.datosParciales.datosCliente,
      nombre: datosCita.nombre || state.datosParciales.datosCliente.nombre,
      apellidos: datosCita.apellidos || state.datosParciales.datosCliente.apellidos,
      correo: datosCita.correo || state.datosParciales.datosCliente.correo,
      empresa: datosCita.empresa || state.datosParciales.datosCliente.empresa
    };
  }
  
  state.datosParciales.datosCita = {
    ...state.datosParciales.datosCita,
    fecha: datosCita.fecha || state.datosParciales.datosCita.fecha,
    hora: datosCita.hora || state.datosParciales.datosCita.hora,
    tipoReunion: datosCita.tipoReunion || state.datosParciales.datosCita.tipoReunion,
    direccion: datosCita.direccion || state.datosParciales.datosCita.direccion
  };
}


function validarCamposRequeridos(state, clienteYaRegistrado) {
  const camposFaltantes = [];
  
  if (!clienteYaRegistrado) {
    if (!state.datosParciales.datosCliente.nombre) camposFaltantes.push("nombre");
    if (!state.datosParciales.datosCliente.apellidos) camposFaltantes.push("apellidos");
    if (!state.datosParciales.datosCliente.correo) camposFaltantes.push("correo");
  }
  
  if (!state.datosParciales.datosCita.fecha) camposFaltantes.push("fecha");
  if (!state.datosParciales.datosCita.hora) camposFaltantes.push("hora");
  if (!state.datosParciales.datosCita.tipoReunion) camposFaltantes.push("tipo de reunión");
  
  // Verificar si es reunión presencial y requiere dirección
  const tipoReunion = state.datosParciales.datosCita.tipoReunion?.toLowerCase() || "";
  const esReunionPresencial = tipoReunion.includes('presencial') || tipoReunion === '2';
  if (esReunionPresencial && !state.datosParciales.datosCita.direccion) {
    camposFaltantes.push("dirección de la oficina");
  }
  
  return camposFaltantes;
}


function determinarTipoReunionId(tipoReunion) {
  const tipoReunionLower = tipoReunion.toLowerCase();
  if (tipoReunionLower.includes('presencial') || tipoReunionLower === '2') {
    return 2;
  } else if (tipoReunionLower.includes('virtual') || tipoReunionLower === '1') {
    return 1;
  }
  return 1;
}


async function procesarRespuestaOpenAI(response, state, sender) {
  try {
    let cleanResponse = response.trim();
    const citaMarker = "===CITA_JSON===";
    const citaIndex = cleanResponse.indexOf(citaMarker);
    
    // Si no hay marcador de cita o ya hay una cita guardada, devolver la respuesta sin procesar
    if (citaIndex === -1 || state.citaGuardada) {
      if (citaIndex !== -1 && state.citaGuardada) {
        cleanResponse = cleanResponse.substring(0, citaIndex).trim() + 
          "\n\nYa tienes una cita agendada. Si deseas modificarla o agendar una nueva, por favor indícalo claramente.";
      }
      return cleanResponse;
    }

  const jsonStart = citaIndex + citaMarker.length;
  const jsonString = cleanResponse.substring(jsonStart).trim();
  
  try {
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No se encontró un objeto JSON válido");
    }
    
    const datosCita = JSON.parse(jsonMatch[0]);
    const clienteYaRegistrado = await clienteExiste(sender);

    inicializarDatosParciales(state, clienteYaRegistrado);
    actualizarDatosParciales(state, datosCita, clienteYaRegistrado);
    
    // Validar campos requeridos
    const camposFaltantes = validarCamposRequeridos(state, clienteYaRegistrado);
    if (camposFaltantes.length > 0) {
      console.log(`Datos incompletos para la cita. Campos faltantes: ${camposFaltantes.join(", ")}`);
      let mensajeSolicitud = clienteYaRegistrado
        ? `\n\nPara confirmar tu cita, solo necesito los siguientes datos: ${camposFaltantes.join(", ")}. ¿Podrías proporcionarlos?`
        : `\n\nPara confirmar tu cita, necesito los siguientes datos: ${camposFaltantes.join(", ")}. ¿Podrías proporcionarlos?`;
      return cleanResponse.substring(0, citaIndex).trim() + mensajeSolicitud;
    }
    
    // Procesar y guardar la cita
    let clienteId;
    if (!clienteYaRegistrado) {
      console.log("Guardando nuevo cliente:", state.datosParciales.datosCliente);
      const clienteResult = await guardarCliente({
        nombre_cliente: `${state.datosParciales.datosCliente.nombre} ${state.datosParciales.datosCliente.apellidos}`,
        correo_cliente: state.datosParciales.datosCliente.correo,
        nombre_empresa: state.datosParciales.datosCliente.empresa,
        telefono_cliente: sender
      });
      clienteId = clienteResult.cliente_id;
    } else {
      // Si el cliente ya existe, obtener su ID sin intentar registrarlo nuevamente
      console.log("Cliente ya registrado, obteniendo ID existente");
      const clienteExistente = await buscarClientePorTelefono(sender);
      
      if (!clienteExistente) {
        console.error("Error: No se pudo obtener la información del cliente existente");
        throw new Error("No se pudo obtener la información del cliente existente");
      }
      
      clienteId = clienteExistente.cliente_id;
    }
    
    // Determinar tipo de reunión y guardar cita
    const tipoReunionId = determinarTipoReunionId(state.datosParciales.datosCita.tipoReunion);
    
    console.log("Guardando cita con datos:", {
      cliente_id: clienteId,
      tiporeunion_id: tipoReunionId,
      fecha_reunion: state.datosParciales.datosCita.fecha,
      hora_reunion: state.datosParciales.datosCita.hora
    });
    
    const citaResult = await guardarCita({
      cliente_id: clienteId,
      asesor_id: datosCita.asesorId || 1,
      tiporeunion_id: tipoReunionId,
      fecha_reunion: state.datosParciales.datosCita.fecha, 
      hora_reunion: state.datosParciales.datosCita.hora,
      direccion: state.datosParciales.datosCita.direccion || datosCita.tienda || 'Lima'
    });
    
    if (!citaResult.success) {
      console.error("Error al guardar la cita:(", citaResult.message);
      throw new Error(citaResult.message); 
    }
    
    state.citaGuardada = true;

    return cleanResponse.substring(0, citaIndex).trim() + 
      `\n¡Tu cita ha sido confirmada para el ${state.datosParciales.datosCita.fecha} a las ${state.datosParciales.datosCita.hora}! Nos pondremos en contacto contigo pronto.`;
  } catch (error) {
    console.error("Error al parsear JSON o guardar cita:", error);
    return cleanResponse.substring(0, citaIndex).trim() + 
      "\n\nLo siento, hubo un problema al confirmar tu cita. Por favor, intenta de nuevo más tarde.";
  }
  } catch (error) {
    console.error("Error general en procesarRespuestaOpenAI:", error);
    return response ? response.trim() : "Lo siento, hubo un problema al procesar tu mensaje. Por favor, intenta de nuevo.";
  }
}

module.exports = { 
  generarPromptDatosRegistro, 
  inicializarDatosParciales,
  procesarRespuestaOpenAI,
  determinarTipoReunionId
};