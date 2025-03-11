const { getOpenAIResponse } = require('../../../services/openaiService.js');
const { clienteExiste } = require('./db/buscarClientes.js');
const path = require('path');
const fs = require('fs').promises;
const { guardarCliente, guardarVehiculo, guardarCita, getVehicleDetails } = require('./db/appointmentDB.js');
const { DIAS_FESTIVOS, obtenerFechaHoraActual, esDiaNoAtencion, validarHorario } = require('./validacionesFechaHora.js');

// Función para leer archivos JSON
const readJsonFile = async (filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading file from ${filePath}:`, error);
        throw error;
    }
};

const inicializarEstado = (state, clienteYaRegistrado) => {
    if (!state.agendamiento) {
        state.agendamiento = {
            datosCliente: clienteYaRegistrado ? null : { nombre: "", apellidos: "", dni: "" },
            datosVehiculo: clienteYaRegistrado ? null : { marca: "", modelo: "", placa: "" },
            datosCita: { fecha: "", hora: "", tienda: "" },
            estado: 'iniciado',
            introMostrada: false
        };
    }
    return state;
};

// Función para obtener los servicios disponibles
const obtenerServicios = async () => {
    try {
        const serviciosPath = path.join(__dirname, '../../../services/json/servicios.json');
        return await readJsonFile(serviciosPath);
    } catch (error) {
        console.error("Error al leer servicios:", error);
        return [];
    }
};

const construirContextoOpenAI = async (state, clienteYaRegistrado) => {
    const servicios = await obtenerServicios();
    const serviciosFormateados = servicios.slice(0, 4).map(s => `${s.id}. ${s.servicio}: ${s.descripcion}`).join('\n');

    const datosRequeridos = clienteYaRegistrado
        ? "- Datos de la cita (servicio, fecha, hora, tienda)."
        : "- Nombre, apellidos, DNI, vehículo (marca, modelo, placa), servicio, fecha, hora, tienda.";

    const seccionCliente = !clienteYaRegistrado ? '"datosCliente": {"nombre": "", "apellidos": "", "dni": ""}' : "";
    const seccionVehiculo = !clienteYaRegistrado ? '"datosVehiculo": {"marca": "", "modelo": "", "placa": ""}' : "";

    // Obtener la fecha y hora actuales 
    const fechaHoraActual = obtenerFechaHoraActual();
    const fechaActualISO = `${fechaHoraActual.año}-${String(fechaHoraActual.mes).padStart(2, '0')}-${String(fechaHoraActual.dia).padStart(2, '0')}`;

    return `
Eres un asistente virtual para agendar citas de servicios automotrices.
La fecha y hora actual del sistema es: ${fechaActualISO}. Usa esto para interpretar referencias como "mañana", "pasado mañana", "sábado", etc.

SERVICIOS DISPONIBLES:
${serviciosFormateados}

Tareas:
1. Detecta la intención de agendar una cita (ejemplo: "Quiero una cita", "Quiero agendar una cita", "Necesito una cita", "Cita por favor", etc.).
2. Si detectas la intención de agendar una cita y 'introMostrada' es false, analiza qué datos ya proporcionó el usuario y cuáles faltan. Extrae los datos proporcionados y devuélvelos en el JSON junto con un mensaje introductorio que solo solicite los datos faltantes: 
   {"mensaje": "¡Claro, por supuesto! Para agendar tu cita, necesito los siguientes datos: [lista solo de datos faltantes]", "datosCliente": {...}, "datosVehiculo": {...}, "datosCita": {...}}
3. Si el usuario solicita la lista de servicios, responde con un mensaje que incluya los servicios disponibles en formato JSON: {"mensaje": "Estos son los servicios disponibles:\n${serviciosFormateados}\n¿Cuál te gustaría agendar?"}
4. Si el mensaje contiene datos (como nombre, fecha, tienda, servicio, etc.), extráelos y devuélvelos en JSON, actualizando el estado con los nuevos datos.
5. Para el servicio, identifica el ID del servicio mencionado comparando con la lista de servicios disponibles. Si encuentras una coincidencia, incluye tanto el nombre del servicio como su ID.
6. Interpreta referencias relativas a la fecha actual:
   - "Mañana" = fecha actual + 1 día.
   - "Pasado mañana" = fecha actual + 2 días.
   - Días de la semana (ej. "sábado") = próximo día de la semana mencionado.
   - Fechas en formato natural (ej. "20 de marzo de 2025") = conviértelas a YYYY-MM-DD.
7. No generes mensajes de solicitud de datos faltantes; solo extrae y devuelve los datos proporcionados. La lógica externa manejará la solicitud de datos faltantes.

Datos requeridos:
${datosRequeridos}

Nota: La fecha en 'datosCita' debe estar en formato YYYY-MM-DD (ej. 2025-03-20). La hora debe estar en formato HH:MM (ej. 14:30).

Estado actual: ${JSON.stringify(state.agendamiento)}.
Responde en JSON: {
  ${seccionCliente}
  ${seccionVehiculo}
  "datosCita": {"fecha": "", "hora": "", "tienda": "", "servicio": "", "servicioId": null}
}
Si detectas solo intención sin datos y 'introMostrada' es false, usa {"mensaje": "..."} como indicado. Si no hay datos ni mensaje introductorio necesario, devuelve un JSON vacío: {}.
  `.trim();
};

const actualizarEstado = (state, analisis, clienteYaRegistrado) => {
    if (!clienteYaRegistrado && analisis.datosCliente) {
        state.agendamiento.datosCliente = { ...state.agendamiento.datosCliente, ...analisis.datosCliente };
    }
    if (!clienteYaRegistrado && analisis.datosVehiculo) {
        state.agendamiento.datosVehiculo = { ...state.agendamiento.datosVehiculo, ...analisis.datosVehiculo };
    }
    if (analisis.datosCita) {
        // Crear una copia de los datos actuales
        const datosCitaActualizados = { ...state.agendamiento.datosCita };

        // Actualizar solo los campos que tienen valores no vacíos en el análisis
        for (const [key, value] of Object.entries(analisis.datosCita)) {
            if (value !== "") {
                datosCitaActualizados[key] = value;
            }
        }

        // Actualizar el estado con los datos combinados
        state.agendamiento.datosCita = datosCitaActualizados;
    }
    if (!state.agendamiento.introMostrada && analisis.mensaje) {
        state.agendamiento.introMostrada = true;
    }
    return state;
};

const obtenerDatosFaltantesClienteVehiculo = (state) => {
    const faltantes = [];
    const { datosCliente, datosVehiculo } = state.agendamiento;
    if (!datosCliente?.nombre) faltantes.push("nombre");
    if (!datosCliente?.apellidos) faltantes.push("apellidos");
    if (!datosCliente?.dni) faltantes.push("DNI");
    if (!datosVehiculo?.marca) faltantes.push("marca del vehículo");
    if (!datosVehiculo?.modelo) faltantes.push("modelo del vehículo");
    if (!datosVehiculo?.placa) faltantes.push("placa del vehículo");
    return faltantes;
};

const obtenerMensajePersonalizadoLLM = async (datoFaltante, nombreCliente) => {
    const contexto = `
Eres un asistente amable que solicita datos para una cita de servicio automotriz.
Genera un mensaje natural y amigable para pedir el siguiente dato: "${datoFaltante}".
El mensaje debe ser corto, personal y variado.
Ejemplos de estilo (no copies exactamente):
- Para fecha: "¿Qué día te gustaría programar tu visita?"
- Para hora: "¿En qué horario prefieres que te atendamos?"
- Para tienda: "¿A cuál de nuestras sedes te queda más cómodo ir?"
Responde solo con el mensaje, sin comillas ni formato JSON.
  `.trim();

    const respuesta = await getOpenAIResponse([
        { role: "system", content: contexto },
        { role: "user", content: "Genera mensaje" }
    ]);
    return respuesta.trim();
};

const obtenerDatosFaltantesCita = async (state, nombreCliente) => {
    const faltantes = [];
    const mensajes = [];
    const { datosCita } = state.agendamiento;

    const campos = [
        { campo: "servicio", etiqueta: "tipo de servicio" },
        { campo: "fecha", etiqueta: "fecha de la cita" },
        { campo: "hora", etiqueta: "hora de la cita" },
        { campo: "tienda", etiqueta: "tienda o sede" }
    ];

    for (const { campo, etiqueta } of campos) {
        // Verificar que el campo existe y no está vacío
        if (!datosCita || !datosCita[campo] || datosCita[campo] === "") {
            faltantes.push(etiqueta);
            mensajes.push(await obtenerMensajePersonalizadoLLM(etiqueta, nombreCliente));
        }
    }

    return { faltantes, mensajes };
};
const resetEstadoAgendamiento = (state) => {
    state.agendamiento = { datosCliente: {}, datosVehiculo: {}, datosCita: {}, estado: null, introMostrada: false };
};

const guardarDatosClienteYVehiculo = async (state, sender, clienteYaRegistrado) => {
    if (clienteYaRegistrado) return;

    const { datosCliente, datosVehiculo } = state.agendamiento;
    const clienteGuardado = await guardarCliente({
        nombre: datosCliente.nombre,
        apellidos: datosCliente.apellidos,
        dni: datosCliente.dni,
        numero_telefono: sender
    });
    if (!clienteGuardado) throw new Error("Error al registrar cliente");

    const vehiculoGuardado = await guardarVehiculo({
        placa: datosVehiculo.placa,
        marca: datosVehiculo.marca,
        modelo: datosVehiculo.modelo,
        numero_telefono: sender
    });
    if (!vehiculoGuardado.success) {
        state.agendamiento.datosVehiculo.placa = "";
        throw new Error(vehiculoGuardado.message);
    }
};

const confirmarCita = async (state, sender, clienteYaRegistrado) => {
    const { datosCita } = state.agendamiento;

    // Validar que todos los campos necesarios estén presentes
    if (!datosCita || !datosCita.fecha || !datosCita.hora || !datosCita.tienda) {
        throw new Error("Faltan datos obligatorios para la cita (fecha, hora o tienda)");
    }

    const latestAppointment = await getVehicleDetails(sender);

    if (clienteYaRegistrado && !latestAppointment) {
        throw new Error("No se encontraron datos del vehículo para un cliente registrado.");
    }

    const placa = clienteYaRegistrado ? latestAppointment.placa : state.agendamiento.datosVehiculo.placa;
    const marca = clienteYaRegistrado ? latestAppointment.marca : state.agendamiento.datosVehiculo.marca;
    const modelo = clienteYaRegistrado ? latestAppointment.modelo : state.agendamiento.datosVehiculo.modelo;

    const citaGuardada = await guardarCita({
        id_servicio: datosCita.servicioId || 1,
        fecha_hora_cita: `${datosCita.fecha} ${datosCita.hora}`,
        numero_telefono: sender,
        id_store: datosCita.tienda,
        placa
    });

    if (!citaGuardada) throw new Error("Error al guardar la cita");

    state.últimaCita = {
        fecha: datosCita.fecha,
        hora: datosCita.hora,
        tienda: datosCita.tienda,
        servicio: datosCita.servicio,
        marca: marca,
        modelo: modelo,
        placa: placa
    };

    // Formatear la fecha para mostrarla en un formato más amigable
    const fechaObj = new Date(datosCita.fecha);
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaSemana = diasSemana[fechaObj.getDay()];
    const dia = fechaObj.getDate();
    const mes = fechaObj.getMonth() + 1;
    const año = fechaObj.getFullYear();
    const fechaFormateada = `${diaSemana} ${dia}/${mes}/${año}`;

    // Formatear la hora para mostrarla en formato 12 horas
    const [hora, minutos] = datosCita.hora.split(':');
    const horaNum = parseInt(hora);
    const ampm = horaNum >= 12 ? 'PM' : 'AM';
    const hora12 = horaNum > 12 ? horaNum - 12 : (horaNum === 0 ? 12 : horaNum);
    const horaFormateada = `${hora12}:${minutos} ${ampm}`;

    // Nombre del cliente (si está disponible)
    const nombreCliente = clienteYaRegistrado ?
        (latestAppointment.nombre || "estimado cliente") :
        (state.agendamiento.datosCliente.nombre || "estimado cliente");

    // Información del asesor (esto podría venir de una base de datos en una implementación real)
    const asesor = {
        nombre: "Juan López",
        telefono: "996306340"
    };

    return `¡Cita confirmada! 
${nombreCliente}, tu ${datosCita.servicio} para tu vehículo ${marca} ${modelo} de placa ${placa} está agendado para el ${fechaFormateada} a las ${horaFormateada} en nuestra sede de ${datosCita.tienda}.

Gracias por elegirnos para cuidar de tu vehículo, estamos comprometidos en ofrecerte el mejor servicio. Tu asesor asignado, ${asesor.nombre} (${asesor.telefono}), estará a tu disposición para cualquier consulta.

Si necesitas algo más o tienes alguna duda, no dudes en avisarnos. ¡Te esperamos!`;
};

const processWithOpenAICita = async (message, sender, nombreCliente, state) => {
    try {
        const clienteYaRegistrado = await clienteExiste(sender);
        state = inicializarEstado(state, clienteYaRegistrado);
        state = inicializarEstado(state, clienteYaRegistrado);

        console.log("Estado inicial:", JSON.stringify(state.agendamiento));

        const contexto = await construirContextoOpenAI(state, clienteYaRegistrado);
        const respuesta = await getOpenAIResponse([
            { role: "system", content: contexto },
            { role: "user", content: message }
        ]);

        let analisis;
        try {

            let jsonStr = respuesta.trim();

            const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                jsonStr = codeBlockMatch[1].trim();
            }

            analisis = JSON.parse(jsonStr);
            console.log("Análisis de OpenAI:", JSON.stringify(analisis));
        } catch (error) {
            console.error("Respuesta no válida de OpenAI:", respuesta);
            return "Lo siento, parece que hubo un problema al procesar tu solicitud. ¿Podrías intentarlo de nuevo, por favor?";
        }

        if (analisis.mensaje) {
            state.agendamiento.introMostrada = true;
            state = actualizarEstado(state, analisis, clienteYaRegistrado);
            console.log("Estado después de mensaje:", JSON.stringify(state.agendamiento));
            return analisis.mensaje;
        }

        state = actualizarEstado(state, analisis, clienteYaRegistrado);
        console.log("Estado actualizado:", JSON.stringify(state.agendamiento));

        if (!clienteYaRegistrado) {
            const faltantesClienteVehiculo = obtenerDatosFaltantesClienteVehiculo(state);
            if (faltantesClienteVehiculo.length > 0) {
                return faltantesClienteVehiculo.length === 1
                    ? `Para poder continuar, por favor, dime tu ${faltantesClienteVehiculo[0]}`
                    : `¡Casi estamos listos! Solo me faltan algunos datos: ${faltantesClienteVehiculo.join(", ")}. ¿Me los puedes proporcionar, por favor?`;
            }
        }

        const datosFaltantesCita = await obtenerDatosFaltantesCita(state, nombreCliente);
        if (datosFaltantesCita.faltantes.length > 0) {
            return datosFaltantesCita.faltantes.length === 1
                ? datosFaltantesCita.mensajes[0]
                : `¡Genial! Para completar tu cita necesito algunos detalles más:\n${datosFaltantesCita.mensajes.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}`;
        }

        // Guardar datos y confirmar cita
        await guardarDatosClienteYVehiculo(state, sender, clienteYaRegistrado);
        const mensajeConfirmacion = await confirmarCita(state, sender, clienteYaRegistrado);

        // Resetear el estado de agendamiento y salir del flujo de citas
        resetEstadoAgendamiento(state);
        state.flowStack = ['normal']; // Forzar regreso al flujo normal

        // Opcionalmente, añadir un mensaje de transición
        return `${mensajeConfirmacion}`;

    } catch (error) {
        console.error("Error en processWithOpenAICita:", error.message);
        return "¡Uy! Parece que algo salió mal. No te preocupes, estoy aquí para ayudarte. ¿Podrías intentarlo nuevamente o contactarme más tarde?";
    }
}; 

module.exports = { processWithOpenAICita };