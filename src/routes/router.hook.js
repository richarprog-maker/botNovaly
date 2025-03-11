const express = require('express')
const router = express.Router()
const {join} = require('path')
const {createReadStream} = require('fs')

const { exec } = require('child_process');

const { getConnection, initializeDBConnection } = require('../config/dbConnection');
const jwt = require("jsonwebtoken");
const bcrypt = require ("bcrypt");
const cookieParser = require ("cookie-parser");


router.post('/send-message-bot', async (req, res) => {
  try {
    const providerWs = req.providerWs;
    const { numero, texto } = req.body;

    // Si "numero" viene sin '@s.whatsapp.net', se lo concatenamos
    // (esto depende de cómo manejes normalmente Baileys)
    const jid = numero.includes('@') ? numero : `${numero}@s.whatsapp.net`;

    // Reemplazos de ejemplo por si usas @salto o @carro
    let newText = texto.replace(/@salto/g, "\n");
    newText = newText.replace(/@carro/g, "\r");

    // Envía el mensaje
    await providerWs.sendText(jid, newText.trim());

    res.send({ data: "enviado!" });
  } catch (error) {
    console.error("[Error en /send-message-bot]:", error);
    res.status(500).send({ error: "Error al enviar el mensaje." });
  }
});



router.post('/send-media-bot', async (req, res) =>{
  const providerWs = req.providerWs;
  const phone      = req.body.phoneid
  const text       = req.body.message;
  const url        = req.body.url;

  let newText = text.replace(/\\n/g, "");
  const textModificado = newText.replace(/\.(?=\s+)/g, ".\n\n");
  var nuevoTexto = textModificado.replace(": .", ":");
      nuevoTexto = nuevoTexto.replace(":.", ":");

  await providerWs.sendMedia(phone, url, nuevoTexto.trim());
  res.send({ data: "enviado!"+url })
});




router.post('/send-file-bot', async (req, res) =>{
  const providerWs = req.providerWs;
  const phone      = req.body.phoneid
  const url        = req.body.url;

  await providerWs.sendFile(phone, url);
  res.send({ data: "enviado!"+url })
});


router.get('/send-confirma-mess/:phoneid/:message', async (req, res) =>{
  const providerWs = req.providerWs;
  const phone      = req.params.phoneid
  const text       = req.params.message;

  let newText = text.replace(/\\n/g, "");
  const textModificado = newText.replace(/\.(?=\s+)/g, ".\n\n");

  await providerWs.sendButtons(phone, textModificado.trim(), [{ body:'1'},{ body:'2'}])
  
  console.log(`Botones....`);
  res.send({ data: "enviado!" })
  
});




router.get('/qr', async (_, res) => {
    const pathQrImage = join(process.cwd(), `bot.qr.png`);
    const fileStream = createReadStream(pathQrImage);
    res.writeHead(200, { "Content-Type": "image/png" });
    fileStream.pipe(res);
});
// router.get('/servicios', async (_, res) => {
//     const pathImage = join(process.cwd(), `assets/img/servicicioskodo.jpg`);
//     const fileStream = createReadStream(pathImage);
//     res.writeHead(200, { "Content-Type": "image/jpeg" });
//     fileStream.pipe(res);
// });

router.get('/qr-create/:name', async (req, res) => {

    const name   = req.params.name
    const pathQrImage = join(process.cwd(), `bot.qr.png`);


     // Ruta de la carpeta que se va a copiar
    const rutaScript = '/home/lucifer/instancias/script-copy-qr.py';

    // Ruta de la carpeta que se va a copiar
    const carpetaOrigen = pathQrImage;

    // Ruta de la carpeta de destino
    const carpetaDestino = '/var/www/html/';

    // Llamar al script de Python
    exec(`python3 ${rutaScript} ${carpetaOrigen} ${carpetaDestino} ${name}`, (error, stdout, stderr) => {
            if (error) {
              console.error(`Error en el script de Python: ${error.message}`);
              res.send({ code: 404, data: `Error en el script de Python: ${stderr}`});
              return;
            }
            if (stderr) {
              console.error(`Error en el script de Python: ${stderr}`);
              res.send({ code: 404, data: `Error en el script de Python: ${stderr}`});
              return;
            }
            console.log(`Carpeta copiada exitosamente`);
            res.send({ code: 200, data: "Instancia generada exitosamente!" });
    });
});


//Verificación de logueo de usuario en base al token
const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  if(!token) {
      return res.json({Error: "No estas logueado"});
  } else {
      jwt.verify(token, "jwt-secret-key", (err, decoded) => {
          if(err) {
              return res.json({Error: "Token is not okey"});
          } else {
              req.name = decoded.name;
              next()      //Pase al siguiente componente
          }
      })
  }
}


//Para el envío al Front dependiendo de la validación del Token
router.get("/", verifyUser, (req, res) =>{
  return res.json({Status: "Success", name: req.name})
})


// Consulta de correo y constraseña ingresado en BBDD
router.post("/sign-in", async (req, res) => {
  try {
      // Inicializar la conexión
      await initializeDBConnection();

      // Obtener la conexión
      const db = await getConnection();

      // Consulta SQL
      const sql = "SELECT * FROM usuarios WHERE correo = ?";
      const [data] = await db.execute(sql, [req.body.email]); // Ejecutar la consulta

      if (data.length > 0) {
          // Usuario encontrado, comparar contraseña
          bcrypt.compare(req.body.password.toString(), data[0].contraseña, (err, response) => {
              if (err) return res.json({ Error: "No se pudo realizar la comparación" });

              if (response) {
                  // Contraseña válida, generar token
                  const name = data[0].name;
                  const token = jwt.sign({ name }, "jwt-secret-key", { expiresIn: "1d" });
                  res.cookie("token", token);
                  return res.json({ Status: "Success" });
              } else {
                  return res.json({ Error: "Contraseña incorrecta" });
              }
          });
      } else {
          return res.json({ Error: "No existe el correo ingresado" });
      }
  } catch (error) {
      console.error("Error en el inicio de sesión:", error);
      return res.json({ Error: "Error de Login en el servidor" });
  }
});


//Para el cierre de sesión
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({Status: "Success"});
})


module.exports = router
