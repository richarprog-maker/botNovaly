const express = require('express')
const cors = require('cors')
const {join} = require('path')
const {createReadStream} = require('fs')
const routes = require('../routes/router.hook.js')
const cookieParser = require('cookie-parser')

const { puertoInit } = require('../../config.js');


class ServerHttp {
    app;
    port;
    providerWs;
    constructor(_providerWs){
        this.port       = puertoInit
        this.providerWs = _providerWs
    }
    initialization = () => {
        this.app = express()
        this.app.use(express.json())
        this.app.use(cors({
            origin: "http://localhost:3000", // Dirección del frontend
            methods: ["POST", "GET"],
            credentials: true,              // Si usas cookies o headers de autenticación
          }))
        this.app.use(cookieParser())
        this.app.use((req, _, next) => {
            req.providerWs = this.providerWs
            next()
        })
        this.app.use(routes)
        this.app.listen(this.port, () => {
            console.log(`port:${this.port}`)
        })
        return this.app;
    }
    start(){
        this.initialization();
    }
}
module.exports = ServerHttp
