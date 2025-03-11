const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('node:fs/promises');
const { convertOggMp3 } = require('../services/convert');
const { exec } = require('child_process');

//FUNCION PARA DESCARGAR EL AUDIO DE WHATSAPP Y COLOCARLO EN UNA CARPETA
const handlerAI = async (ctx) => {
  /**
   * OMITIR
   */
  var response_voice  = ``;
  response_voice   = `voice-note-${Date.now()}`;  //Almacena el nombre del archivo

  const buffer = await downloadMediaMessage(ctx, "buffer");  //Descarga del mensaje de audio
  const pathTmpOgg = `${process.cwd()}/tmp/${response_voice}.ogg`;  //Crea el path en formato ogg
  const pathTmpMp3 = `${process.cwd()}/tmp/${response_voice}.mp3`;  //Crea el path en formato mp3
  await fs.writeFile(pathTmpOgg, buffer);  //Guarda el archivo ogg
  await convertOggMp3(pathTmpOgg, pathTmpMp3);  //Utiliza una función para convertir y guardar en mp3

  //Codigo de abajo comentado porque no es similar al nombre con el que se crea el archivo (Ahora se encuentra arriba)
  //response_voice   = `voice-note-${puertoinit}-${Date.now()}.mp3`;

  // Ruta de la carpeta que se va a copiar
  const rutaScript = '/home/lucifer/instancias/script-copy-qr.py';
  // Ruta de la carpeta que se va a copiar
  const carpetaOrigen = pathTmpMp3;
  // Ruta de la carpeta de destino
  const carpetaDestino = '/var/www/html/';
  // Llamar al script de Python
  exec(`python3 ${rutaScript} ${carpetaOrigen} ${carpetaDestino} ${response_voice}`, (error, stdout, stderr) => {
          console.log(`Voice copiada exitosamente ${response_voice}`);
  });

  return response_voice+".mp3"; //el habla1!!
};

const delay = (miliseconds) =>
  new Promise((res) => setTimeout(res, miliseconds));




module.exports = { handlerAI, delay };
