const {
  consultarRankingTHP,
  consultarAlianzas,
  consultarDetalleAlianza,
} = require("../../server/services/lastintel");

const {
  obtenerConCache,
  obtenerBloqueo,
} = require("../../server/services/cacheNetlify");

const SERVIDORES_PERMITIDOS = [
  1451, 1468, 1490, 1497, 1535, 1541, 1542,
];

function responder(datos, estado = 200) {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function responderError(error, mensaje) {
  console.error(mensaje, error);

  if (error.codigo === "LASTINTEL_LIMITE_DIARIO") {
    return responder(
      {
        error: "LASTINTEL_LIMITE_DIARIO",
        mensaje: "Las ballenas se han ido a dormir.",
        hasta: error.hasta ?? null,
      },
      503
    );
  }

  return responder({ error: mensaje }, 502);
}

// Netlify Functions API moderna.
exports.default = async function (request) {
  const url = new URL(request.url);
  const ruta = url.pathname;

  if (request.method !== "GET") {
    return responder({ error: "Método no permitido" }, 405);
  }

  if (ruta === "/api/status") {
    return responder({
      app: "Warzone RR91",
      status: "online",
      message: "Backend funcionando correctamente",
    });
  }

  if (ruta === "/api/lastintel/estado") {
    try {
      const bloqueo = await obtenerBloqueo();

      return responder({
        bloqueado: Boolean(bloqueo),
        hasta: bloqueo?.hasta ?? null,
      });
    } catch (error) {
      console.error("Error al consultar el bloqueo:", error);

      return responder(
        { error: "No se pudo consultar el estado de LastIntel" },
        500
      );
    }
  }

  if (ruta === "/api/ranking") {
    try {
      const servidor = Number(
        url.searchParams.get("server") ?? 1451
      );

      if (!SERVIDORES_PERMITIDOS.includes(servidor)) {
        return responder({ error: "Servidor no válido" }, 400);
      }

      const jugadores = await obtenerConCache(
        `ranking_${servidor}_100`,
        () => consultarRankingTHP(servidor, 100)
      );

      return responder({
        servidor,
        total: jugadores.length,
        jugadores,
      });
    } catch (error) {
      return responderError(
        error,
        "No se pudo obtener el ranking de LastIntel"
      );
    }
  }

  if (ruta === "/api/alianzas") {
    try {
      const servidor = Number(url.searchParams.get("server"));

      if (!SERVIDORES_PERMITIDOS.includes(servidor)) {
        return responder({ error: "Servidor no válido" }, 400);
      }

      const alianzas = await obtenerConCache(
        `alianzas_${servidor}`,
        () => consultarAlianzas(servidor)
      );

      return responder({ servidor, alianzas });
    } catch (error) {
      return responderError(
        error,
        "No se pudieron obtener las alianzas"
      );
    }
  }

  const coincidencia = ruta.match(/^\/api\/alianza\/([^/]+)$/);

  if (coincidencia) {
    try {
      const id = decodeURIComponent(coincidencia[1]);

      const detalle = await obtenerConCache(
        `alianza_${id}`,
        () => consultarDetalleAlianza(id)
      );

      return responder(detalle);
    } catch (error) {
      return responderError(
        error,
        "No se pudo consultar la alianza"
      );
    }
  }

  return responder({ error: "Ruta no encontrada" }, 404);
};