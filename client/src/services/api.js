async function consultarAPI(ruta, mensajeError) {
  const respuesta = await fetch(ruta);

  if (!respuesta.ok) {
    let datos = null;

    try {
      datos = await respuesta.json();
    } catch {
      // La respuesta podría no ser JSON.
    }

    if (datos?.error === "LASTINTEL_LIMITE_DIARIO") {
      // Avisamos al componente principal.
      window.dispatchEvent(
        new Event("lastintel:bloqueado")
      );

      const error = new Error(
        "🐳 Las ballenas se han ido a dormir. " +
        "Hemos agotado las consultas de LastIntel."
      );

      error.codigo = "LASTINTEL_LIMITE_DIARIO";
      error.hasta = datos.hasta ?? null;

      throw error;
    }

    throw new Error(mensajeError);
  }

  return respuesta.json();
}

// Estado del backend.
export async function obtenerEstadoServidor() {
  return consultarAPI(
    "/api/status",
    "No se pudo conectar con el servidor"
  );
}

// Ranking THP de un servidor.
export async function obtenerRankingTHP(servidor = 1451) {
  return consultarAPI(
    `/api/ranking?server=${servidor}`,
    "No se pudo obtener el ranking"
  );
}

// Alianzas de un servidor.
export async function obtenerAlianzas(servidor) {
  const datos = await consultarAPI(
    `/api/alianzas?server=${servidor}`,
    "No se pudieron obtener las alianzas"
  );

  return datos.alianzas;
}

// Comandantes de una alianza.
export async function obtenerDetalleAlianza(id) {
  return consultarAPI(
    `/api/alianza/${encodeURIComponent(id)}`,
    "No se pudo obtener el detalle de la alianza"
  );
}