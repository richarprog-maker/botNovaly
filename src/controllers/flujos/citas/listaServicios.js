
const axios = require('axios');
async function sendMessageServiciosMedia() {
    const texto = `En Kodomotors nos especializamos en brindar servicios profesionales y de alta calidad para tu vehículo. Conoce nuestra gama completa de servicios`;
    const endpoint = 'http://localhost:3004/send-media-bot';
    const urlMedia = 'http://localhost:3004/servicios';
    const mensaje = {
        phoneid: '51960953104@s.whatsapp.net',
        message: texto,          
        url: urlMedia            
    };

    await axios.post(endpoint, mensaje);
}

module.exports = {
    sendMessageServiciosMedia
};