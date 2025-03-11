const{openai}  = require('../config/openaiConfig.js');

async function getOpenAIResponse(messages) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini-2024-07-18",
            messages,
            max_tokens: 200,
            temperature: 0.7
        });

        if (!response.choices?.[0]?.message?.content) {
            throw new Error("La respuesta de OpenAI no tiene el formato esperado.");
        }

        return response.choices[0].message.content;

    } catch (error) {
        console.error("Error al obtener respuesta de OpenAI:", error);
        throw error;
    }
}

module.exports = {
    getOpenAIResponse
};