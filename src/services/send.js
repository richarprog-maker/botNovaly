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