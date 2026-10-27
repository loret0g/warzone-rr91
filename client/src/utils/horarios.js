const HUSOS_POR_PAIS = {
  // Asia oriental
  TW: ["Asia/Taipei"],
  KR: ["Asia/Seoul"],
  JP: ["Asia/Tokyo"],
  CN: ["Asia/Shanghai"],
  HK: ["Asia/Hong_Kong"],
  MO: ["Asia/Macau"],

  // Sudeste asiático
  VN: ["Asia/Ho_Chi_Minh"],
  TH: ["Asia/Bangkok"],
  PH: ["Asia/Manila"],
  ID: ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"],
  MY: ["Asia/Kuala_Lumpur"],
  SG: ["Asia/Singapore"],

  // Oriente Medio
  SA: ["Asia/Riyadh"],
  TR: ["Europe/Istanbul"],
  IQ: ["Asia/Baghdad"],
  AE: ["Asia/Dubai"],
  IR: ["Asia/Tehran"],

  // Europa
  ES: ["Europe/Madrid"],
  FR: ["Europe/Paris"],
  DE: ["Europe/Berlin"],
  IT: ["Europe/Rome"],
  GB: ["Europe/London"],
  PT: ["Europe/Lisbon", "Atlantic/Azores"],
  PL: ["Europe/Warsaw"],
  RU: [
    "Europe/Kaliningrad",
    "Europe/Moscow",
    "Asia/Yekaterinburg",
    "Asia/Omsk",
    "Asia/Krasnoyarsk",
    "Asia/Irkutsk",
    "Asia/Yakutsk",
    "Asia/Vladivostok",
    "Asia/Magadan",
    "Asia/Kamchatka",
  ],

  // América
  US: [
    "Pacific/Honolulu",
    "America/Anchorage",
    "America/Los_Angeles",
    "America/Denver",
    "America/Chicago",
    "America/New_York",
  ],
  CA: [
    "America/Vancouver",
    "America/Edmonton",
    "America/Winnipeg",
    "America/Toronto",
    "America/Halifax",
    "America/St_Johns",
  ],
  BR: [
    "America/Rio_Branco",
    "America/Manaus",
    "America/Sao_Paulo",
    "America/Noronha",
  ],
  MX: [
    "America/Tijuana",
    "America/Hermosillo",
    "America/Mexico_City",
    "America/Cancun",
  ],
  AR: ["America/Argentina/Buenos_Aires"],
  CL: ["America/Santiago", "Pacific/Easter"],

  // Oceanía
  AU: [
    "Australia/Perth",
    "Australia/Darwin",
    "Australia/Adelaide",
    "Australia/Brisbane",
    "Australia/Sydney",
  ],
  NZ: ["Pacific/Auckland", "Pacific/Chatham"],
  // América Central
  BZ: ["America/Belize"],

  // Asia meridional
  IN: ["Asia/Kolkata"],

  // Unión Europea: referencia convencional de la aplicación
  EU: ["Europe/Paris"],
};

// Una fecha representativa de la temporada 5.
// La usamos para calcular correctamente los husos horarios.
const FECHA_REFERENCIA = "2026-11-18";

const FRANJAS = [7, 15, 23];

function obtenerHoraEnZona(fecha, zona) {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: zona,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);

  const hora = Number(
    partes.find((parte) => parte.type === "hour").value
  );

  const minuto = Number(
    partes.find((parte) => parte.type === "minute").value
  );

  return hora * 60 + minuto;
}

function convertirFranja(horaEuropa, zonas) {
  // Durante la temporada, Europa/París está en UTC+1.
  const fechaUTC = new Date(
    `${FECHA_REFERENCIA}T${String(horaEuropa - 1).padStart(2, "0")}:00:00Z`
  );

  const minutosEuropa = horaEuropa * 60;

  const resultados = zonas.map((zona) => {
    const minutosLocales = obtenerHoraEnZona(fechaUTC, zona);

    // Desfase respecto a la hora europea.
    let diferencia = minutosLocales - minutosEuropa;

    // Ajustar diferencias que cruzan medianoche.
    if (diferencia > 12 * 60) diferencia -= 24 * 60;
    if (diferencia < -12 * 60) diferencia += 24 * 60;

    const minutosTotales = minutosEuropa + diferencia;
    const dia = Math.floor(minutosTotales / 1440);
    const minutoDelDia =
      ((minutosTotales % 1440) + 1440) % 1440;

    const hh = String(Math.floor(minutoDelDia / 60)).padStart(2, "0");
    const mm = String(minutoDelDia % 60).padStart(2, "0");

    return {
      minutosTotales,
      texto: `${hh}:${mm}`,
      dia,
    };
  });

  resultados.sort((a, b) => a.minutosTotales - b.minutosTotales);

  const primero = resultados[0];
  const ultimo = resultados[resultados.length - 1];

  if (primero.minutosTotales === ultimo.minutosTotales) {
    return primero.texto;
  }

  return `${primero.texto} – ${ultimo.texto}`;
}

export function obtenerHorarios(codigoPais) {
  const codigo = codigoPais?.toUpperCase();
  const zonas = HUSOS_POR_PAIS[codigo];

  if (!zonas) {
    return ["—", "—", "—"];
  }

  return FRANJAS.map((hora) => convertirFranja(hora, zonas));
}