const { getConnection } = require('../../../../config/dbConnection');

/**
 * Verifica si un cliente existe en la base de datos por su número de teléfono
 * @param {string} telefono - Número de teléfono del cliente a buscar
 * @returns {Promise<boolean>} - true si el cliente existe, false en caso contrario
 */
const clienteExiste = async (telefono) => {
    let connection;
    try {
        connection = await getConnection();
        const query = `
            SELECT COUNT(*) as count
            FROM tbl_clientes
            WHERE telefono_cliente = ? LIMIT 1
        `;
        const [rows] = await connection.query(query, [telefono]);
        return rows[0].count > 0;
    } catch (error) {
        console.error("Error al verificar si el cliente existe:", error);
        return false;
    } finally {
        if (connection) {
            try {
                await connection.release();
                console.log("Conexión liberada en clienteExiste");
            } catch (releaseError) {
                console.error("Error al liberar conexión en clienteExiste:", releaseError);
            }
        }
    }
};

/**
 * Busca un cliente por su número de teléfono
 * @param {string} telefono - Número de teléfono del cliente a buscar
 * @returns {Promise<Object|null>} - Datos del cliente o null si no existe
 */
const buscarClientePorTelefono = async (telefono) => {
    let connection;
    try {
        connection = await getConnection();
        const query = `
            SELECT cliente_id, nombre_cliente, correo_cliente, nombre_empresa, telefono_cliente
            FROM tbl_clientes 
            WHERE telefono_cliente = ?
            LIMIT 1
        `;
        const [rows] = await connection.query(query, [telefono]);
        
        if (rows.length === 0) {
            console.log(`No se encontró cliente con teléfono: ${telefono}`);
            return null;
        }
        
        return rows[0];
    } catch (error) {
        console.error("Error al buscar cliente por teléfono:", error);
        throw new Error(`Error al buscar cliente: ${error.message}`);
    } finally {
        if (connection) {
            try {
                await connection.release();
                console.log("Conexión liberada en buscarClientePorTelefono");
            } catch (releaseError) {
                console.error("Error al liberar conexión en buscarClientePorTelefono:", releaseError);
            }
        }
    }
};

module.exports = {
    clienteExiste,
    buscarClientePorTelefono
};