const express = require("express");

const {
  obtenerRankingTHP,
  obtenerAlianzas,
  obtenerDetalleAlianza,
} = require("./services/lastintel");

const { obtenerBloqueo } = require("./services/cache");

const app = express();
const PORT = 3001;

const SERVIDORES_PERMITIDOS = [
  1451, 1468, 1490, 1497, 1535, 1541, 1542,
];

// Respuesta común para errores de LastIntel.
function responderError(res, error, mensaje) {
  console.error(mensaje, error);

  if (error.codigo === "LASTINTEL_LIMITE_DIARIO") {
    return res.status(503).json({
      error: "LASTINTEL_LIMITE_DIARIO",
      mensaje: "Las ballenas se han ido a dormir.",
      hasta: error.hasta ?? null,
    });
  }

  return res.status(502).json({
    error: mensaje,
  });
}

// Comprobar que nuestro backend funciona.
app.get("/api/status", (req, res) => {
  res.json({
    app: "Warzone RR91",
    status: "online",
    message: "Backend funcionando correctamente",
  });
});

// Consultar el estado de LastIntel SIN gastar llamadas.
app.get("/api/lastintel/estado", async (req, res) => {
  try {
    const bloqueo = await obtenerBloqueo();

    res.json({
      bloqueado: Boolean(bloqueo),
      hasta: bloqueo?.hasta ?? null,
    });
  } catch (error) {
    console.error(
      "Error al consultar el estado de LastIntel:",
      error
    );

    res.status(500).json({
      error: "No se pudo consultar el estado de LastIntel",
    });
  }
});

// Ranking de comandantes de un servidor.
app.get("/api/ranking", async (req, res) => {
  try {
    const servidor = Number(req.query.server ?? 1451);

    if (!SERVIDORES_PERMITIDOS.includes(servidor)) {
      return res.status(400).json({
        error: "Servidor no válido",
      });
    }

    const jugadores = await obtenerRankingTHP(servidor, 100);

    res.json({
      servidor,
      total: jugadores.length,
      jugadores,
    });
  } catch (error) {
    responderError(
      res,
      error,
      "No se pudo obtener el ranking de LastIntel"
    );
  }
});

// Listado de alianzas de un servidor.
app.get("/api/alianzas", async (req, res) => {
  try {
    const servidor = Number(req.query.server);

    if (!SERVIDORES_PERMITIDOS.includes(servidor)) {
      return res.status(400).json({
        error: "Servidor no válido",
      });
    }

    const alianzas = await obtenerAlianzas(servidor);

    res.json({
      servidor,
      alianzas,
    });
  } catch (error) {
    responderError(
      res,
      error,
      "No se pudieron obtener las alianzas"
    );
  }
});

// Detalle de los comandantes de una alianza.
app.get("/api/alianza/:id", async (req, res) => {
  try {
    const detalle = await obtenerDetalleAlianza(req.params.id);

    res.json(detalle);
  } catch (error) {
    responderError(
      res,
      error,
      "No se pudo consultar la alianza"
    );
  }
});

app.listen(PORT, () => {
  console.log(
    `Warzone RR91 API: http://localhost:${PORT}`
  );
});