const OpenAI = require('openai');
const { getConnection } = require('../config/dbConnection.js');
const { getStores } = require('./sigma/storeService.js');
require('dotenv').config();

/**
 * Verificar que la variable de entorno OPENAI_API_KEY está definida
 */
if (!process.env.OPENAI_API_KEY) {
    console.error("Error: La variable de entorno OPENAI_API_KEY no está definida.");
    process.exit(1);
}

/**
 * Configuración de OpenAI
 */
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Función para obtener sucursales desde la API
 * @returns {Promise<string>} - Lista de sucursales formateadas o mensaje de error
 */
async function getSucursales() {
    try {
        const response = await getStores();

        if (response.code !== 200 || !response.data || !Array.isArray(response.data.stores)) {
            return "No se encontraron sucursales disponibles en este momento.";
        }

        const stores = response.data.stores;

        if (stores.length === 0) {
            return "No se encontraron sucursales disponibles en este momento.";
        }

        return stores.map(store => 
            `- Nombre: ${store.name}, Dirección: ${store.address}, Teléfono: ${store.phone}`
        ).join('\n');
    } catch (error) {
        console.error("Error al obtener sucursales:", error);
        return "Ocurrió un error al buscar nuestras sucursales. Inténtalo más tarde.";
    }
}
function obtenerHora() {
    const ahora = new Date();
    return ahora.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}
async function processWithOpenAI(message, isFirstInteraction = false) {
    try {
        const sucursales = await getSucursales();
        const hora =  obtenerHora();
        let systemMessage = `Eres un asistente virtual especializado de Kodomotors llamado Tania, enfocado en brindar una experiencia excepcional al cliente.

        COMPORTAMIENTO BASE:
        - Personalidad: Profesional, amable y eficiente
        - Tono: Respetuoso pero cercano
        - Prioridad: Resolver consultas de forma rápida y precisa

        PROTOCOLO DE SALUDOS:
        - Antes de 12:00 (Perú): "Buenos días" seguin la siguiente hora ${hora}
        - Después de 12:00 (Perú): "Buenas tardes" la siguiente hora ${hora}
        - Primera interacción: [Saludo según hora] + "¿En qué puedo ayudarte hoy?"
        - Evitar: "¡Hola!" y preguntas directas sobre sucursales

        GESTIÓN DE CONSULTAS:
        1. Sucursales:
           - Si pide lista general: Mostrar numeración y nombres
           - Si indica número específico: Mostrar SOLO datos completos de esa sucursal
           - Si menciona nombre: Mostrar SOLO datos de esa sucursal
           - Si pregunta dato específico: Mostrar SOLO ese dato solicitado

        2. Formato de respuesta para sucursal específica:
           Nombre: [nombre]
           Tipo IGV: [tipo]
           Tasa IGV: [tasa]
           Dirección: [dirección]
           Teléfono: [teléfono]

        3. Áreas de atención (mostrar solo si se solicita):
           - Información de sucursales
           - Servicios automotrices
           - Citas y reservas
           - Precios y cotizaciones
           - Consultas generales

        MANEJO DE IDIOMAS:
        - Si detecta idioma diferente al español: "Por favor, escribe tu consulta en español"

        DATOS DE SUCURSALES:
        ${sucursales}

        REGLAS CRÍTICAS:
        1. NO asumir el motivo de la consulta
        2. NO ofrecer información no solicitada
        3. NO usar emojis ni lenguaje informal
        4. Responder SOLO con la información específicamente solicitada
        5. Si se ingresa un número, mostrar ÚNICAMENTE los datos de la sucursal correspondiente a ese número en la lista
        6. Ante consultas poco claras, solicitar aclaración específica
        7. Si dice gracias debrias de decir "De nada,  hasta luego"
        8. En caso que no encuentres la sucursal, dile que no se encontro y manda la lista de las sucursales para que elija`;

        if (isFirstInteraction) {
            systemMessage += `\nPRIMERA INTERACCIÓN: Limitar respuesta a saludo según hora + "¿En qué puedo ayudarte hoy?"`;
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: message }
            ],
            max_tokens: 150,
            temperature: 0.5 // Reducido para respuestas más consistentes
        });

        if (!completion.choices?.[0]?.message?.content) {
            throw new Error("Respuesta inválida de OpenAI");
        }

        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error("[Error OpenAI]:", error);
        return "Disculpe, estamos experimentando alta demanda. ¿Podría intentar nuevamente en unos momentos?";
    }
}
/**
 * Función principal para obtener respuestas
 * @param {number} type - Tipo de mensaje (1: audio, 2: texto)
 * @param {string} message - Contenido del mensaje
 * @param {string} sender - Es el número del remitente
 * @returns {Promise<string>} - Respuesta correspondiente
 */
async function getResponseTextMain(type, message, sender) {
    try {
        if (!message) {
            throw new Error("Mensaje faltante");
        }

        console.log(`Procesando mensaje. Tipo: ${type}, Sender: ${sender}`);

        return await processWithOpenAI(message);
    } catch (error) {
        console.error("[Error en getResponseTextMain]:", error);
        return "Lo siento, ocurrió un error al procesar tu solicitud. Por favor, inténtalo de nuevo más tarde.";
    }
}

/**
 * Exportar la función como una promesa
 */
module.exports = {
    getResponseText: async (type, message, sender) => {
        try {
            return await getResponseTextMain(type, message, sender);
        } catch (error) {
            console.error("[Error en wrapper getResponseText]:", error);
            return "Error del sistema. Por favor, inténtalo más tarde.";
        }
    }
};
