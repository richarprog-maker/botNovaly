const fs = require('fs').promises;
const path = require('path');

async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error al leer el archivo:", error);
        throw error;
    }
}

module.exports = { readJsonFile };
