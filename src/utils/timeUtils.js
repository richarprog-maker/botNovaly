
/**
 * Obtiene la hora actual en formato 24h (HH:MM).
 */
function obtenerHora() {
    const ahora = new Date();
    return ahora.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  
  module.exports = {
    obtenerHora,
  };
  