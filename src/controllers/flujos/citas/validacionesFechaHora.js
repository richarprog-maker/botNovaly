const DIAS_FESTIVOS = [
    { mes: 0, dia: 1 }, { mes: 4, dia: 1 }, { mes: 6, dia: 28 },
    { mes: 6, dia: 29 }, { mes: 9, dia: 8 }, { mes: 10, dia: 1 }, { mes: 11, dia: 8 }
];

const obtenerFechaHoraActual = () => {
    const ahora = new Date();
    return {
        dia: ahora.getDate(),
        mes: ahora.getMonth() + 1,
        año: ahora.getFullYear(),
        hora: ahora.getHours(),
        minutos: ahora.getMinutes()
    };
};

const esDiaNoAtencion = (fecha) =>
    fecha.getDay() === 0 ||
    DIAS_FESTIVOS.some(({ mes, dia }) => mes === fecha.getMonth() && dia === fecha.getDate());

const validarHorario = (fecha) => {
    if (esDiaNoAtencion(fecha)) return false;
    const diaSemana = fecha.getDay();
    const hora = fecha.getHours();
    const minutos = fecha.getMinutes();

    if (diaSemana >= 1 && diaSemana <= 5) {
        return hora >= 8 && (hora < 18 || (hora === 18 && minutos === 0));
    }
    if (diaSemana === 6) {
        return hora >= 8 && (hora < 13 || (hora === 13 && minutos === 0));
    }
    return false;
};

module.exports = {
    DIAS_FESTIVOS,
    obtenerFechaHoraActual,
    esDiaNoAtencion,
    validarHorario
};