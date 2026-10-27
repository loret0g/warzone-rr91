import { obtenerHorarios } from "./horarios";

// Convierte una hora local en minutos.
function horaAMinutos(texto) {
  const coincidencia = texto.match(/(\d{2}):(\d{2})/);

  if (!coincidencia) return null;

  return (
    Number(coincidencia[1]) * 60 +
    Number(coincidencia[2])
  );
}

// Escala gradual de colores según el desfase horario.
function colorPorDesfase(desfase) {
  const puntos = [
    { hora: -12, tono: 155 },
    { hora: -7, tono: 170 },
    { hora: 0, tono: 230 },
    { hora: 4.5, tono: 280 },
    { hora: 6, tono: 320 },
    { hora: 7, tono: 345 },
    { hora: 8, tono: 385 },
    { hora: 14, tono: 415 },
  ];

  for (let i = 0; i < puntos.length - 1; i++) {
    const actual = puntos[i];
    const siguiente = puntos[i + 1];

    if (desfase <= siguiente.hora) {
      const proporcion = Math.max(
        0,
        Math.min(
          1,
          (desfase - actual.hora) /
            (siguiente.hora - actual.hora)
        )
      );

      const tono =
        actual.tono +
        (siguiente.tono - actual.tono) * proporcion;

      return `hsl(${tono % 360} 65% 52%)`;
    }
  }

  return "hsl(55 65% 52%)";
}

// Devuelve el color de un comandante según su horario.
export function obtenerColorHorario(codigoPais) {
  const horarios = obtenerHorarios(codigoPais);

  if (!horarios || horarios[0] === "—") {
    return "#6b7280";
  }

  // Para países con varios husos, utilizamos
  // el punto medio del intervalo.
  const partes = horarios[0].split(" – ");

  const minutos = partes
    .map(horaAMinutos)
    .filter((valor) => valor !== null);

  if (minutos.length === 0) {
    return "#6b7280";
  }

  const promedio =
    minutos.reduce((suma, valor) => suma + valor, 0) /
    minutos.length;

  // 07:00 Europa = 420 minutos.
  const desfase = (promedio - 420) / 60;

  return colorPorDesfase(desfase);
}