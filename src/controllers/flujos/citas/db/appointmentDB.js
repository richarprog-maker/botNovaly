const { getConnection } = require('../../../../config/dbConnection');

const guardarCliente = async (cliente) => {
    try {
        const connection = await getConnection();
        const query = `
            INSERT INTO tbl_clientes (nombre_cliente, correo_cliente, nombre_empresa, telefono_cliente)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await connection.query(query, [
            cliente.nombre_cliente,
            cliente.correo_cliente,
            cliente.nombre_empresa,
            cliente.telefono_cliente
        ]);
        return { success: true, cliente_id: result.insertId };
    } catch (error) {
        console.error("Error al guardar el cliente:", error);
        return { success: false, message: "Hubo un error al registrar el cliente. Intenta de nuevo." };
    }
};

const guardarAsesor = async (asesor) => {
    try {
        const connection = await getConnection();
        const query = `
            INSERT INTO tbl_asesores (nombre_asesor, correo_asesor, telefono_asesor, horario_atencion)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await connection.query(query, [
            asesor.nombre_asesor,
            asesor.correo_asesor,
            asesor.telefono_asesor,
            asesor.horario_atencion
        ]);
        return { success: true, asesor_id: result.insertId };
    } catch (error) {
        console.error("Error al guardar el asesor:", error);
        return { success: false, message: "Hubo un error al registrar el asesor. Intenta de nuevo." };
    }
};

const guardarCita = async (cita) => {
    try {
        // Validar y formatear fecha y hora antes de guardar
        let fechaReunion = cita.fecha_reunion;
        let horaReunion = cita.hora_reunion;
        
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
        
        console.log(`Guardando cita con fecha: ${fechaReunion} y hora: ${horaReunion}`);
        
        const connection = await getConnection();
        const query = `
            INSERT INTO tbl_citas (cliente_id, asesor_id, tiporeunion_id, fecha_reunion, hora_reunion, direccion)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.query(query, [
            cita.cliente_id,
            cita.asesor_id,
            cita.tiporeunion_id,
            fechaReunion,
            horaReunion,
            cita.direccion
        ]);
        return result.affectedRows > 0
            ? { success: true, message: "¡Cita agendada exitosamente!", cita_id: result.insertId }
            : { success: false, message: "Lo siento, hubo un error al guardar la cita. Por favor, inténtalo de nuevo." };
    } catch (error) {
        console.error("Error en guardarCita:", error);
        return { success: false, message: `Error al guardar la cita: ${error.message}` };
    }
};

const obtenerTiposReunion = async () => {
    try {
        const connection = await getConnection();
        const query = `
            SELECT tiporeunion_id, nombre
            FROM tbl_tiporeunion
        `;
        const [rows] = await connection.query(query);
        return rows;
    } catch (error) {
        console.error("Error al obtener tipos de reunión:", error);
        return [];
    }
};
 
const obtenerAsesores = async () => {
    try {
        const connection = await getConnection();
        const query = `
            SELECT asesor_id, nombre_asesor, correo_asesor, telefono_asesor, horario_atencion
            FROM tbl_asesores
        `;
        const [rows] = await connection.query(query);
        return rows;
    } catch (error) {
        console.error("Error al obtener asesores:", error);
        return [];
    }
};


module.exports = {
    guardarCliente,
    guardarAsesor,
    guardarCita,
    obtenerTiposReunion,
    obtenerAsesores
};