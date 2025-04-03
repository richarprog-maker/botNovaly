const { readFile } = require('fs/promises');
const { addKeyword, EVENTS } = require("@bot-whatsapp/bot");
const delay = (ms) => new Promise((res => setTimeout(res, ms)));


const { getResponseText } = require('../controllers/main/flujoPrincipal.js');
class HookServices {


    mensaje = "";
    urmedia = "";
    urmediaaux1 = "";
    urmediaaux2 = "";
    gps = "";
    ubicacion = "";

    constructor() {

    }

    buildHeader = () => {
        const headers = new Headers()
        headers.append('api_access_token', this.config.token)
        headers.append('Content-Type', 'application/json')
        return headers
    }

    buildBaseUrl = (path) => {
        return this.config.endpoint + path;
    }


    sendMensajeApi = async (message, sender, type) => {
        try {
            // // Verificar si el mensaje está relacionado con temas no permitidos
            // const temaNoPermitido = this.verificarTemaNoPermitido(message);
            
            // if (temaNoPermitido) {
            //     console.log(`[Filtro de temas] Mensaje filtrado: ${message}`);
            //     return {
            //         texto: 'Como asistente especializado en servicios tecnológicos, estoy enfocado en ayudarte con consultas relacionadas con tecnología y los servicios que ofrece Novaly. ¿Te gustaría que te derive con un asesor humano que podría ayudarte mejor con otras consultas?',
            //         urmedia: '',
            //         gps: '',
            //         ubicacion: ''
            //     };
            // }
            
            const response = await getResponseText(type, message, sender);
            if (!response) {
                return {
                    texto: 'Lo siento, no pude procesar tu mensaje. ¿Podrías intentarlo de nuevo?',
                    urmedia: '',
                    gps: '',
                    ubicacion: ''
                };
            }

            // Si la respuesta es un objeto y contiene propiedades de botones, la retornamos directamente
            // if (typeof response === 'object' && response.buttons) {
            //     return response;
            // }
            return {
                texto: response,
                urmedia: '',
                gps: '',
                ubicacion: ''
            };
        } catch (error) {
            console.error('[Error en sendMensajeApi]', error);
            return {
                texto: 'Hubo un error procesando tu mensaje. Por favor, inténtalo de nuevo.',
                urmedia: '',
                gps: '',
                ubicacion: ''
            };
        }
    };
    
    // Método para verificar si el mensaje trata sobre temas no relacionados con tecnología o servicios de TI
    // verificarTemaNoPermitido = (message) => {
    //     if (!message) return false;
        
    //     // Convertir a minúsculas para facilitar la comparación
    //     const mensajeLower = message.toLowerCase();
        
    //     // Palabras clave relacionadas con tecnología y servicios de TI (permitidas)
    //     const palabrasPermitidas = [
    //         'bot', 'asistente', 'virtual', 'ia', 'inteligencia artificial', 'software', 'desarrollo', 'app', 
    //         'aplicación', 'web', 'cloud', 'nube', 'automatización', 'procesos', 'bi', 'business intelligence',
    //         'tablero', 'dashboard', 'digital', 'tecnología', 'servicio', 'ti', 'it', 'sistema', 'programa',
    //         'novaly', 'precio', 'costo', 'demo', 'reunión', 'cita', 'asesor', 'consulta', 'ayuda', 'soporte',
    //         'técnico', 'personalización', 'seguridad', 'datos', 'cifrado', 'saas', 'software as a service'
    //     ];
        
    //     // Verificar si el mensaje contiene al menos una palabra permitida
    //     const contienePalabraPermitida = palabrasPermitidas.some(palabra => 
    //         mensajeLower.includes(palabra)
    //     );
        
    //     // Si el mensaje es muy corto (como un saludo) o contiene palabras permitidas, no lo filtramos
    //     if (mensajeLower.length < 15 || contienePalabraPermitida) {
    //         return false;
    //     }
        
    //     // Temas no relacionados con tecnología o servicios de TI (filtrar estos temas)
    //     const temasNoPermitidos = [
    //         'política', 'religión', 'deportes', 'receta', 'cocina', 'clima', 'tiempo', 'horóscopo',
    //         'astrología', 'juego', 'apuesta', 'lotería', 'romance', 'cita amorosa', 'medicina', 'salud',
    //         'enfermedad', 'síntoma', 'diagnóstico', 'tratamiento', 'legal', 'abogado', 'ley', 'demanda',
    //         'finanzas personales', 'inversión', 'bolsa', 'acciones', 'entretenimiento', 'película', 'serie',
    //         'música', 'concierto', 'viaje', 'hotel', 'vuelo', 'reserva', 'turismo'
    //     ];
        
    //     // Verificar si el mensaje contiene temas no permitidos
    //     return temasNoPermitidos.some(tema => mensajeLower.includes(tema));
    // };



    readMensajeApi = async (res_body, res_from, res_type) => {
        try {
            if (!this.processMessage) {
                throw new Error('processMessage method not defined');
            }

            const response = this.processMessage(res_body, res_from, res_type);
            return {
                texto: response?.texto || '',
                urmedia: response?.urmedia || ''
            };
        } catch (error) {
            console.error(`[Error en readMensajeApi]`, error);
            return {
                texto: '',
                urmedia: ''
            };
        }
    };
    processMessage(body, from, type) {
        // Add message processing logic here
        return {
            texto: body || '',
            urmedia: ''
        };
    }




    updateStatusBot = async (status, numero) => {
        const datos = {
            body: status,
            phone: numero
        };

        try {
            const response = {
                texto: datos.body || '',
                urmedia: ''
            };

            this.mensaje = response.texto;
            this.urmedia = response.urmedia;

            return {
                texto: this.mensaje,
                urmedia: this.urmedia
            };
        } catch (error) {
            console.error('[Error]', error);
            return {
                texto: '',
                urmedia: ''
            };
        }
    }











    //ACTUALIZAR CONTACTOS
    updateLibraryApi = async (res_body) => {
        const datos = {
            body: res_body
        };
        try {
            const url = this.buildBaseUrl(`/updateLibraryApi`)
            const dataFetch = await fetch(url, {
                headers: this.buildHeader(),
                method: 'POST',
                body: JSON.stringify(datos)
            }).then(response => response.json())
                .then(json => {
                    this.mensaje = json.texto
                });
            const data = {
                texto: this.mensaje,
            };
            return data
        } catch (error) {
            console.error(`[Error]`, error)
            const data = {
                texto: "",
            };
            return data
        }
    }

}


module.exports = HookServices