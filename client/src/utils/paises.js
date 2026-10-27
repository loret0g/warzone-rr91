
const nombres = new Intl.DisplayNames(["es"], {
  type: "region",
});

const regiones = {
  // Asia oriental
  TW: "asia-oriental",
  KR: "asia-oriental",
  JP: "asia-oriental",
  CN: "asia-oriental",
  HK: "asia-oriental",
  MO: "asia-oriental",

  // Sudeste asiático
  VN: "sudeste-asiatico",
  TH: "sudeste-asiatico",
  PH: "sudeste-asiatico",
  ID: "sudeste-asiatico",
  MY: "sudeste-asiatico",
  SG: "sudeste-asiatico",

  // Asia meridional
  IN: "asia-meridional",

  // Oriente Medio
  SA: "oriente-medio",
  TR: "oriente-medio",
  IQ: "oriente-medio",
  AE: "oriente-medio",
  IR: "oriente-medio",

  // Europa
  ES: "europa",
  FR: "europa",
  DE: "europa",
  IT: "europa",
  GB: "europa",
  PT: "europa",
  PL: "europa",
  RU: "europa",
  EU: "europa",

  // América
  US: "america",
  CA: "america",
  BR: "america",
  MX: "america",
  AR: "america",
  CL: "america",
  BZ: "america",

  // Oceanía
  AU: "oceania",
  NZ: "oceania",

};

const colores = {
  "asia-oriental": "#60a5fa",
  "asia-meridional": "#fb923c",
  "sudeste-asiatico": "#a78bfa",
  "oriente-medio": "#fbbf24",
  europa: "#f472b6",
  america: "#4ade80",
  oceania: "#22d3ee",
  otros: "#9ca3af",
};

export function obtenerPais(codigo) {
  const pais = codigo?.toUpperCase();
  if (pais === "EU") {
  return {
    nombre: "Unión Europea",
    bandera: "🇪🇺",
    region: "europa",
    color: colores.europa,
  };
}

  if (!pais || pais === "UN" || !/^[A-Z]{2}$/.test(pais)) {
    return {
      nombre: "ONU",
      bandera: "🏳️",
      region: "otros",
      color: colores.otros,
    };
  }

  const nombre = nombres.of(pais);

  if (!nombre || nombre === pais) {
    return {
      nombre: "ONU",
      bandera: "🏳️",
      region: "otros",
      color: colores.otros,
    };
  }

  const bandera = String.fromCodePoint(
    ...pais.split("").map((letra) => letra.charCodeAt(0) + 127397)
  );

  const region = regiones[pais] ?? "otros";

  return {
    nombre,
    bandera,
    region,
    color: colores[region],
  };
}