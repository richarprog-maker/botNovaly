
require('dotenv').config();

module.exports = {
    baseUrl: process.env.API_BASE_URL,
    apiToken: process.env.API_TOKEN,
    tenantId: process.env.TENANT_ID,
    puertoInit: process.env.PUERTO_INIT
};
