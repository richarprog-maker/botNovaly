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
        const connection = await getConnection();
        const query = `
            INSERT INTO tbl_citas (cliente_id, asesor_id, tiporeunion_id, fecha_reunion, hora_reunion, direccion)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.query(query, [
            cita.cliente_id,
            cita.asesor_id,
            cita.tiporeunion_id,
            cita.fecha_reunion,
            cita.hora_reunion,
            cita.direccion
        ]);
        return result.affectedRows > 0
            ? { success: true, message: "¡Cita agendada exitosamente!", cita_id: result.insertId }
            : { success: false, message: "Lo siento, hubo un error al guardar la cita. Por favor, inténtalo de nuevo." };
    } catch (error) {
        console.error("Error en guardarCita:", error);
        return { success: false, message: "Ups, parece que hubo un error interno al agendar. Por favor, verifica los datos e inténtalo nuevamente." };
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

// La función obtenerClientePorTelefono se ha movido a buscarClientes.js

module.exports = {
    guardarCliente,
    guardarAsesor,
    guardarCita,
    obtenerTiposReunion,
    obtenerAsesores
};