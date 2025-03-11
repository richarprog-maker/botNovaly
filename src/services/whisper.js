const fs = require("fs");
const { OpenAI } = require("openai"); // Nota: 'Configuration' ya no existe en v4.x
const { gptapi } = require("../../config.js");

/**
 * Transcribe un archivo de audio utilizando la API de OpenAI
 * @param {string} path Ruta del archivo mp3
 * @returns {Promise<string>} Transcripción en texto
 */
const voiceToText = async (path) => {
  if (!fs.existsSync(path)) {
    throw new Error("No se encuentra el archivo");
  }

  // Inicializa el cliente OpenAI
  const openai = new OpenAI({
    apiKey: gptapi || process.env.OPENAI_API_KEY, // Usa la clave desde config.js o variables de entorno
  });

  // Realiza la transcripción
  try {
    const respuesta = await openai.audio.transcriptions.create({
      file: fs.createReadStream(path),
      model: "whisper-1",
    });

    return respuesta.text; // Devuelve la transcripción
  } catch (err) {
    console.error("Error en la transcripción:", err);
    throw new Error("Falló la transcripción del audio");
  }
};

module.exports = { voiceToText };