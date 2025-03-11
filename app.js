const dotenv = require('dotenv');
const path = require('path');
// Ruta completa al archivo de configuración .env
const envPath = path.join(__dirname, './.env');
// Cargamos el archivo de configuración .env
dotenv.config({ path: envPath });

const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const JsonFileAdapter = require('@bot-whatsapp/database/json')

const giveVoiceNote = require("./src/smartFlow/giveVoiceNote");
const givePdf = require("./src/smartFlow/givePdf");
const giveMedia = require("./src/smartFlow/giveMedia");
const giveTexto = require("./src/smartFlow/giveTexto");

const ServerHttp = require('./src/http/server')

const QRPortal = require('@bot-whatsapp/portal');
const main = async () => {

    const flows = [
        giveTexto,
        giveVoiceNote,
        givePdf,
        giveMedia
    ];

    const adapterDB = new JsonFileAdapter()
    const adapterFlow = createFlow([...flows])
    const adapterProvider = createProvider(BaileysProvider)
    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB
    },
        {
            globalState: {
                status: true,
            }
        })
    const server = new ServerHttp(adapterProvider);
    server.start();

}
QRPortal({ port: 4001 });
main()
