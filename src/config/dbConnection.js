const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración del pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    timezone: "-05:00", 
    waitForConnections: true,
    connectionLimit: 10, 
    queueLimit: 0
});

pool.on('acquire', (connection) => {
    console.log(`[MySQL] Conexión adquirida (ID: ${connection.threadId})`);
});

pool.on('release', (connection) => {
    console.log(`[MySQL] Conexión liberada (ID: ${connection.threadId})`);
});

pool.on('error', (err) => {
    console.error('[MySQL] Error en el pool:', err);
});

/**
 * Prueba de conexión al inicializar
 */
async function testConnection() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('[MySQL] Conexión exitosa al servidor MySQL');
        await conn.ping();
        console.log('[MySQL] Ping exitoso');
    } catch (error) {
        console.error('[MySQL] Error en la prueba de conexión:', error);
    } finally {
        if (conn) await conn.release();
    }
}

// Ejecutar prueba al cargar el módulo
testConnection();

module.exports = { 
    getConnection: () => pool.getConnection()
};