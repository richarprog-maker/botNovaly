function generarEnlaceGoogleMaps(direccion) {
    const baseUrl = 'https://www.google.com/maps/search/?api=1&query=';
    return `${baseUrl}${encodeURIComponent(direccion)}`;
}

module.exports = { generarEnlaceGoogleMaps };
