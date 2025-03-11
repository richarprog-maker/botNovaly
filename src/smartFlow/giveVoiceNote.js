const { addKeyword, EVENTS } = require("@bot-whatsapp/bot");
const HookServices  = require('../services/send');
const { voiceToText } = require('../services/whisper');
const { handlerAI } = require("../utils/utils.js");
const delay = (ms) => new Promise((res =>  setTimeout(res, ms)));
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('node:fs/promises');
const { exec } = require('child_process');
const { puertoinit } = require('../../config.js');
const servicesHook = new HookServices();

module.exports = addKeyword(EVENTS.VOICE_NOTE).addAction(async (ctx, {flowDynamic, gotoFlow, provider}) => {
        //console.log(ctx);       
        if (ctx.key.fromMe){ 
                        
                        const jid         = ctx.key.remoteJid;
                        const refProvider = await provider.getInstance();
                        const text        = await handlerAI(ctx);
                        const respuesta   = await servicesHook.readMensajeApi(text, ctx.from, 2);

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

                        const jid         = ctx.key.remoteJid;
                        const refProvider = await provider.getInstance();

                        const text      = await handlerAI(ctx);  //Para la descarga y ubicación en carpeta tmp
                        const ruta_audio = "./tmp/"+text;  //Se construye la ruta del audio recibido
                        console.log(ruta_audio);

                        const transcripcion = await voiceToText(ruta_audio);  //Se realiza la transcripción del audio a texto
                        console.log("Texto transcrito:", transcripcion);
                        
                        //Envio del texto obtenido del audio para recibir una respuesta
                        const respuesta = await servicesHook.sendMensajeApi(transcripcion, ctx.from, 2, null, rt_data);

                        
                        if(respuesta.urmedia!=""){

                                await refProvider.presenceSubscribe(jid);
                                await delay(5000);
                                await refProvider.sendPresenceUpdate('recording', jid);

                                await flowDynamic([{ body: "Escucharlo audio", media: respuesta.urmedia, delay:100 }]);

                        }else{

                                if(respuesta.texto!=""){
                                        await refProvider.presenceSubscribe(jid);
                                        await delay(5000);
                                        await refProvider.sendPresenceUpdate('composing', jid);

                                        const text = respuesta.texto;
                                        if (text.length < 1000) {
						var newText = text.replace(/@salto/g, "\n");
                                                var newText2 = newText.replace(/@carro/g, "\r");
                                                await flowDynamic([{ body: newText2.trim(), delay:100}])
                                        } else {
                                                // Aquí puedes realizar alguna otra acción si el texto es igual o mayor a 100 caracteres
                                                const chunks = text.split(/(?<!\d)\.\s+/g);
                                                for (const chunk of chunks) {
                                                        await flowDynamic([{ body: chunk.trim(), delay: 100 }]);
                                                }
                                        }

                                        if(respuesta.gps!=""){
                                                const jsonData = respuesta.ubicacion;
                                                console.log(jsonData);
                                                for (let sucursal in jsonData) {
                                                        const { sucursales, urmediaaux1, textmediaaux1, urmediaaux2, textmediaaux2, latitud, longitud, textlatlon, direccion } = jsonData[sucursal];
                                                        await flowDynamic([{ body: sucursales+" "+direccion, delay: 100 }]);
                                                        if(urmediaaux1!=""){
                                                                await provider.sendMedia(jid, urmediaaux1, textmediaaux1);
                                                        }
                                                        if(urmediaaux2!=""){
                                                                await provider.sendMedia(jid, urmediaaux2, textmediaaux2);
                                                        }
                                                        if(latitud!=0){
                                                                await provider.sendLocation(jid, latitud, longitud);
                                                                await flowDynamic([{ body: textlatlon, delay: 100 }]);
                                                        }
                                                        
                                                }
                                        }
                                        
                                }

                        }

                        buffer = Buffer.alloc(0);
        }
        

});
