const { addKeyword, EVENTS } = require("@bot-whatsapp/bot");
const HookServices = require('../services/send')
const delay = (ms) => new Promise((res =>  setTimeout(res, ms)));
const servicesHook = new HookServices();

module.exports = addKeyword(EVENTS.DOCUMENT).addAction(async (ctx, {flowDynamic, gotoFlow, provider}) => {
        if (ctx.key.fromMe){ 

                        const respuesta = await servicesHook.readMensajeApi(ctx.body, ctx.from, 2);

        }else{
                        const respuesta = await servicesHook.sendMensajeApi("enviomedia", ctx.from, 2, null, null);
                        if(respuesta.texto!=""){
                                const jid = ctx.key.remoteJid;
                                const refProvider = await provider.getInstance();

                                await refProvider.presenceSubscribe(jid);
                                await delay(2000);
                                await refProvider.sendPresenceUpdate('composing', jid);
                                await flowDynamic([{ body: respuesta.texto, delay:100}]);
                        }
        }
});