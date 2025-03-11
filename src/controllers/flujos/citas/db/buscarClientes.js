const { getConnection } = require('../../../../config/dbConnection');

/**
 * Verifica si un cliente existe en la base de datos por su número de teléfono
 * @param {string} telefono - Número de teléfono del cliente a buscar
 * @returns {Promise<boolean>} - true si el cliente existe, false en caso contrario
 */
const clienteExiste = async (telefono) => {
    try {
        const connection = await getConnection();
        const query = `
            SELECT COUNT(*) as count
            FROM tbl_clientes
            WHERE telefono_cliente = ?
        `;
        const [rows] = await connection.query(query, [telefono]);
        return rows[0].count > 0;
    } catch (error) {
        console.error("Error al verificar si el cliente existe:", error);
        return false;
    }
};

/**
 * Busca un cliente por su número de teléfono
 * @param {string} telefono - Número de teléfono del cliente a buscar
 * @returns {Promise<Object|null>} - Datos del cliente o null si no existe
 */
const buscarClientePorTelefono = async (telefono) => {
    try {
        const connection = await getConnection();
        const query = `
            SELECT cliente_id, nombre_cliente, correo_cliente, nombre_empresa, telefono_cliente
            FROM tbl_clientes
            WHERE telefono_cliente = ?
        `;
        const [rows] = await connection.query(query, [telefono]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error("Error al buscar cliente por teléfono:", error);
        return null;
    }
};

module.exports = {
    clienteExiste,
    buscarClientePorTelefono
};