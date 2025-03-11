const { getConnection } = require('../../../../config/dbConnection');

const obtenerDetallesUltimaCita = async (telefono) => {
    try {
        const conexion = await getConnection();
        const consulta = `
            SELECT c.cita_id, c.fecha_reunion, c.hora_reunion, c.direccion,
                   tr.tiporeunion_id, tr.nombre AS tipo_reunion,
                   cl.cliente_id, cl.nombre_cliente, cl.correo_cliente, cl.nombre_empresa,
                   a.asesor_id, a.nombre_asesor, a.correo_asesor, a.telefono_asesor
            FROM tbl_citas c
            JOIN tbl_tiporeunion tr ON c.tiporeunion_id = tr.tiporeunion_id
            JOIN tbl_clientes cl ON c.cliente_id = cl.cliente_id
            LEFT JOIN tbl_asesores a ON c.asesor_id = a.asesor_id
            WHERE cl.telefono_cliente = ?
            ORDER BY c.cita_id DESC
            LIMIT 1
        `;
        const [filas] = await conexion.query(consulta, [telefono]);
        return filas[0];
    } catch (error) {
        console.error("Error al obtener detalles de la última cita:", error);
        return null;
    }
}; 

module.exports = {
    obtenerDetallesUltimaCita
};