const { getConnection } = require('../../../../config/dbConnection');


const formatearDetallesCita = (cita) => {
    if (!cita) {
        // Devolver un objeto con estructura adecuada cuando no hay citas previas
        return {
            textoFormateado: "No se encontraron citas previas."
        };
    }
    
    // Formatear fecha para mostrarla en formato DD/MM/YYYY
    const fechaOriginal = new Date(cita.fecha_reunion);
    const fechaFormateada = `${fechaOriginal.getDate().toString().padStart(2, '0')}/${(fechaOriginal.getMonth() + 1).toString().padStart(2, '0')}/${fechaOriginal.getFullYear()}`;

    // Formatear hora para mostrarla en formato HH:MM
    const horaOriginal = cita.hora_reunion;
    const horaFormateada = horaOriginal.substring(0, 5);

    // Crear texto formateado para mostrar al usuario
    const textoFormateado = `
    Datos de tu última cita:
    - Fecha: ${fechaFormateada}
    - Hora: ${horaFormateada}
    - Tipo de reunión: ${cita.tipo_reunion}
    ${cita.direccion ? `- Dirección: ${cita.direccion}` : ''}
    - Asesor: ${cita.nombre_asesor || 'Por asignar'}
    `;

    // Devolver objeto original con el texto formateado añadido
    return {
        ...cita,
        textoFormateado
    };
};

const obtenerDetallesUltimaCita = async (telefono) => {
    let conexion;
    try {
        conexion = await getConnection();
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
        
        // Formatear los detalles de la cita antes de devolverlos
        return formatearDetallesCita(filas[0]);
    } catch (error) {
        console.error("Error al obtener detalles de la última cita:", error);
        return null;
    } finally {
        if (conexion) {
            try {
                await conexion.release();
                console.log("Conexión liberada en obtenerDetallesUltimaCita");
            } catch (releaseError) {
                console.error("Error al liberar conexión en obtenerDetallesUltimaCita:", releaseError);
            }
        }
    }
}; 

module.exports = {
    obtenerDetallesUltimaCita
};