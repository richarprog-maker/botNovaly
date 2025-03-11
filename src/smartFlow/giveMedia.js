const { addKeyword, EVENTS } = require("@bot-whatsapp/bot");
const HookServices = require('../services/send');
const delay = (ms) => new Promise((res =>  setTimeout(res, ms)));
const servicesHook = new HookServices();

const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('node:fs/promises');
const { exec } = require('child_process');
const { puertoinit } = require('../../config.js');

module.exports = addKeyword(EVENTS.MEDIA).addAction(async (ctx, {flowDynamic, gotoFlow, provider}) => {
        //await delay(5000);
        //console.log("documento media");
        //console.log(ctx);
        if (ctx.key.fromMe){ 

                        const respuesta = await servicesHook.readMensajeApi(ctx.body, ctx.from, 2);

        }else{
                        var rt_respon  = ``;
                        var rt_caption = ``;
                        var rt_type   = 0; 
                        var rt_data   = null;    
                        if(ctx.message.extendedTextMessage){      
                                if(ctx.message.extendedTextMessage.contextInfo){    
                                        const contextInfo = ctx.message.extendedTextMessage.contextInfo;
                                        if (contextInfo && contextInfo.remoteJid) {
                                                if(contextInfo.remoteJid=='status@broadcast'){
                                                        if(contextInfo.quotedMessage.extendedTextMessage){
                                                                console.log('Texto de Estado: '+contextInfo.quotedMessage.extendedTextMessage.text);
                                                                console.log("Contenido de contextInfo:", contextInfo.quotedMessage.extendedTextMessage);
                                                                rt_respon = contextInfo.quotedMessage.extendedTextMessage.text;
                                                                rt_type   = 1;
                                                        }
                                                        if(contextInfo.quotedMessage.imageMessage){
                                                                console.log('Imagen de Estado: ');
                                                                console.log("Contenido de contextInfo:", contextInfo.quotedMessage.imageMessage);
                                                                const stream = await downloadContentFromMessage(contextInfo.quotedMessage.imageMessage, 'image');
                                                                const pathTmpMedia = `${process.cwd()}/tmp/media-${Date.now()}.png`;
                                                                await fs.writeFile(pathTmpMedia, stream);
                                                                rt_respon   = `media-responde-${puertoinit}-${Date.now()}.png`;
                                                                // Ruta de la carpeta que se va a copiar
                                                                const rutaScript = '/home/lucifer/instancias/script-copy-qr.py';
                                                                // Ruta de la carpeta que se va a copiar
                                                                const carpetaOrigen = pathTmpMedia;
                                                                // Ruta de la carpeta de destino
                                                                const carpetaDestino = '/var/www/html/';
                                                                // Llamar al script de Python
                                                                exec(`python3 ${rutaScript} ${carpetaOrigen} ${carpetaDestino} ${rt_respon}`, (error, stdout, stderr) => {
                                                                        //console.log(`Imagen copiada exitosamente ${rt_respon}`);
                                                                });
                                                                rt_type   = 2;
                                                                if(contextInfo.quotedMessage.imageMessage.caption){
                                                                        rt_caption = contextInfo.quotedMessage.imageMessage.caption;
                                                                }
                                                        }
                                                        if(contextInfo.quotedMessage.videoMessage){
                                                                console.log('Video de Estado: ');
                                                                console.log("Contenido de contextInfo:", contextInfo.quotedMessage.videoMessage);
                                                                rt_type   = 3;
                                                                if(contextInfo.quotedMessage.videoMessage.caption){
                                                                        rt_caption = contextInfo.quotedMessage.videoMessage.caption;
                                                                }
                                                        }
                                                        
                                                }
                                        }
                                }
                        }
                        console.log(`RT respose ${rt_respon}`);
                        console.log(`RT type ${rt_type}`);
                        console.log(`RT caption ${rt_caption}`);
                        rt_data = [rt_respon, rt_type, rt_caption];

                        var name   = `enviomedia`;
                        if (ctx.message?.imageMessage) {
                                const buffer       = await downloadMediaMessage(ctx, "buffer");
                                const pathTmpMedia = `${process.cwd()}/tmp/media-${Date.now()}.png`;
                                await fs.writeFile(pathTmpMedia, buffer);

                                name   = `media-${puertoinit}-${Date.now()}.png`;
                                // Ruta de la carpeta que se va a copiar
                                const rutaScript = '/home/lucifer/instancias/script-copy-qr.py';
                                // Ruta de la carpeta que se va a copiar
                                const carpetaOrigen = pathTmpMedia;
                                // Ruta de la carpeta de destino
                                const carpetaDestino = '/var/www/html/';
                                // Llamar al script de Python
                                exec(`python3 ${rutaScript} ${carpetaOrigen} ${carpetaDestino} ${name}`, (error, stdout, stderr) => {
                                        if (error) {
                                                console.error(`Error en el script de Python: ${error.message}`);
                                        }
                                        if (stderr) {
                                                console.error(`Error en el script de Python: ${stderr}`);
                                        }
                                                console.log(`Imagen copiada exitosamente`);
                                });
                        }
                        
                        var caption = null;
                        if (ctx.message?.imageMessage.caption) {
                                caption = ctx.message?.imageMessage.caption;
                        }
                        
                        const respuesta = await servicesHook.sendMensajeApi(name, ctx.from, 4, caption, rt_data);
                        if(respuesta.texto!=""){
                                const jid = ctx.key.remoteJid;
                                const refProvider = await provider.getInstance();
                        
                                await refProvider.presenceSubscribe(jid);
                                await delay(2000);
                                await refProvider.sendPresenceUpdate('composing', jid);
                        
                                const text = respuesta.texto;
                                if (text.length < 1000) {
                                        let newText = text.replace(/\\n/g, "");
                                        const textModificado = newText.replace(/\.(?=\s+)/g, ".\n\n");
                                        var nuevoTexto = textModificado.replace(": .", ":");
                                            nuevoTexto = nuevoTexto.replace(":.", ":");
                                        await flowDynamic([{ body: nuevoTexto.trim(), delay:500}])
                                } else {
                                        const chunks = text.split(/(?<!\d)\.\s+/g);
                                        for (const chunk of chunks) {
                                                await flowDynamic([{ body: chunk.trim(), delay: 100 }]);
                                        }
                                }
                        }

                        
        }
        

});