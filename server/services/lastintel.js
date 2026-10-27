const URL = "https://mcp.lastintel.io";

const { obtenerConCache } = require("./cache");

// Interpretamos las respuestas JSON y SSE de LastIntel.
function interpretarRespuesta(cuerpo, tipo) {
  if (tipo.includes("text/event-stream")) {
    const eventos = cuerpo
      .split(/\r?\n/)
      .filter((linea) => linea.startsWith("data:"))
      .map((linea) => linea.slice(5).trim())
      .filter((linea) => linea && linea !== "[DONE]");

    if (eventos.length === 0) {
      throw new Error("Respuesta MCP sin datos JSON");
    }

    return JSON.parse(eventos[eventos.length - 1]);
  }

  return JSON.parse(cuerpo);
}

// Detectamos específicamente el límite anónimo diario.
function comprobarError(datos, estadoHTTP) {
  const errorMCP = datos?.error;
  const informacion = errorMCP?.data || {};

  if (
    informacion.reason === "anonymous_day" ||
    (
      informacion.error === "login_required" &&
      informacion.limit === 200 &&
      informacion.retryable === true
    )
  ) {
    const error = new Error(
      "LastIntel ha agotado las consultas anónimas del día."
    );

    error.codigo = "LASTINTEL_LIMITE_DIARIO";

    error.retryAfterSeconds = Number(
      informacion.retryAfterSeconds
    );

    throw error;
  }

  if (errorMCP) {
    throw new Error(
      `LastIntel: ${errorMCP.message || "Error desconocido"}`
    );
  }

  if (datos?.result?.isError) {
    throw new Error("LastIntel devolvió un error.");
  }

  if (estadoHTTP >= 400) {
    throw new Error(`Error de LastIntel: ${estadoHTTP}`);
  }
}

// Todas las consultas utilizan esta misma función.
async function consultarLastIntel(nombreHerramienta, argumentos) {
  const respuesta = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-06-18",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: nombreHerramienta,
        arguments: argumentos,
      },
    }),
  });

  const tipo = respuesta.headers.get("content-type") || "";
  const cuerpo = await respuesta.text();

  let datos;

  try {
    datos = interpretarRespuesta(cuerpo, tipo);
  } catch (error) {
    throw new Error(
      `No se pudo interpretar la respuesta de LastIntel ` +
      `(HTTP ${respuesta.status}): ${error.message}`
    );
  }

  comprobarError(datos, respuesta.status);

  return datos.result?.structuredContent;
}

// Ranking de comandantes por THP.
async function consultarRankingTHP(servidor, limite) {
  const resultado = await consultarLastIntel(
    "list_top_commanders",
    {
      board: "heroPower",
      warzones: [servidor],
      limit: limite,
    }
  );

  const jugadores = resultado?.items;

  if (!Array.isArray(jugadores)) {
    throw new Error("Formato de ranking inesperado");
  }

  return jugadores.map((jugador) => ({
    id: jugador.uid,
    nombre: jugador.name,
    bandera: jugador.country,
    alianza: jugador.allianceTag,
    servidor: jugador.serverId,
    thp: jugador.heroPower,
  }));
}

// Listado de alianzas de un servidor.
async function consultarAlianzas(servidor) {
  const resultado = await consultarLastIntel(
    "get_warzone_alliances",
    {
      serverId: servidor,
      board: "power",
      limit: 50,
    }
  );

  const alianzas = resultado?.alliances;

  if (!Array.isArray(alianzas)) {
    throw new Error("Formato de alianzas inesperado");
  }

  return alianzas.map((alianza) => ({
    id: alianza.id,
    nombre: alianza.name,
    etiqueta: alianza.tag,
    servidor: alianza.serverId,
    poder: alianza.power,
    miembros: alianza.curMember,
    miembrosObservados: alianza.countryKnown ?? 0,
    thpObservado: alianza.heroPowerSum ?? null,
    paises: alianza.countries ?? [],
  }));
}

// Plantilla de comandantes de una alianza.
async function consultarDetalleAlianza(id) {
  const alianza = await consultarLastIntel(
    "get_alliance",
    {
      allianceId: id,
    }
  );

  if (!alianza || !Array.isArray(alianza.roster)) {
    throw new Error("Formato de plantilla inesperado");
  }

  return {
    id: alianza.id,
    nombre: alianza.name,
    etiqueta: alianza.tag,
    servidor: alianza.serverId,
    miembros: alianza.curMember,

    jugadores: alianza.roster.map((jugador) => ({
      id: jugador.uid,
      nombre: jugador.name,
      bandera: jugador.country ?? null,
      servidor: jugador.serverId,
      alianza: alianza.tag,
      alianzaId: alianza.id,
      thp: jugador.metrics?.heroPower ?? null,
      poder: jugador.power ?? null,
      nivel: jugador.metrics?.hq ?? null,
    })),
  };
}

// La caché decide cuándo consultar LastIntel.
module.exports = {
  obtenerRankingTHP: (servidor, limite = 100) =>
    obtenerConCache(
      `ranking_${servidor}_${limite}`,
      () => consultarRankingTHP(servidor, limite)
    ),

  obtenerAlianzas: (servidor) =>
    obtenerConCache(
      `alianzas_${servidor}`,
      () => consultarAlianzas(servidor)
    ),

  obtenerDetalleAlianza: (id) =>
    obtenerConCache(
      `alianza_${id}`,
      () => consultarDetalleAlianza(id)
    ),
};