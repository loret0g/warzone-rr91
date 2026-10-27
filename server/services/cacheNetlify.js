const { getStore } = require("@netlify/blobs");

const ZONA_HORARIA = "Europe/Madrid";
const NOMBRE_ALMACEN = "warzone-rr91-cache";
const CLAVE_BLOQUEO = "estado_lastintel";

const pendientes = new Map();

function fechaActual() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function obtenerAlmacen() {
  return getStore({
    name: NOMBRE_ALMACEN,
    consistency: "strong",
  });
}

function claveSegura(clave) {
  return clave.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function leerJSON(clave) {
  const almacen = obtenerAlmacen();

  return almacen.get(claveSegura(clave), {
    type: "json",
  });
}

async function guardarJSON(clave, contenido) {
  const almacen = obtenerAlmacen();

  await almacen.setJSON(
    claveSegura(clave),
    contenido
  );
}

async function leerCache(clave) {
  return leerJSON(clave);
}

async function guardarCache(clave, datos) {
  const contenido = {
    fecha: fechaActual(),
    actualizadoEn: new Date().toISOString(),
    datos,
  };

  await guardarJSON(clave, contenido);
}

async function obtenerBloqueo() {
  const estado = await leerJSON(CLAVE_BLOQUEO);

  if (
    !estado?.hasta ||
    !Number.isFinite(Date.parse(estado.hasta))
  ) {
    return null;
  }

  if (Date.parse(estado.hasta) <= Date.now()) {
    return null;
  }

  return estado;
}

async function registrarBloqueo(segundos) {
  const duracion = Number(segundos);

  if (!Number.isFinite(duracion) || duracion <= 0) {
    return null;
  }

  const hasta = new Date(
    Date.now() + duracion * 1000
  ).toISOString();

  const bloqueo = {
    motivo: "limite_diario",
    hasta,
  };

  await guardarJSON(CLAVE_BLOQUEO, bloqueo);

  console.warn(
    `[LASTINTEL] Cupo agotado. Disponible de nuevo: ${hasta}`
  );

  return bloqueo;
}

function crearErrorBloqueo(bloqueo) {
  const error = new Error(
    "Las ballenas se han ido a dormir."
  );

  error.codigo = "LASTINTEL_LIMITE_DIARIO";
  error.hasta = bloqueo.hasta;

  return error;
}

async function obtenerConCache(clave, consultar) {
  if (pendientes.has(clave)) {
    return pendientes.get(clave);
  }

  const peticion = (async () => {
    const guardado = await leerCache(clave);
    const hoy = fechaActual();

    // Reutilizamos los datos obtenidos hoy.
    if (guardado?.fecha === hoy) {
      return guardado.datos;
    }

    // Comprobamos si LastIntel ha agotado el cupo.
    const bloqueo = await obtenerBloqueo();

    if (bloqueo) {
      if (guardado) {
        return guardado.datos;
      }

      throw crearErrorBloqueo(bloqueo);
    }

    try {
      const datos = await consultar();

      await guardarCache(clave, datos);

      console.log(
        `[CACHE NETLIFY] Actualizada: ${clave}`
      );

      return datos;
    } catch (error) {
      if (
        error.codigo === "LASTINTEL_LIMITE_DIARIO" &&
        error.retryAfterSeconds
      ) {
        const bloqueoNuevo = await registrarBloqueo(
          error.retryAfterSeconds
        );

        error.hasta = bloqueoNuevo?.hasta ?? null;
      }

      // Conservamos los datos anteriores si falla.
      if (guardado) {
        console.warn(
          `[CACHE NETLIFY] Error al actualizar ${clave}. ` +
          "Utilizando datos guardados."
        );

        return guardado.datos;
      }

      throw error;
    }
  })();

  pendientes.set(clave, peticion);

  try {
    return await peticion;
  } finally {
    pendientes.delete(clave);
  }
}

module.exports = {
  obtenerConCache,
  obtenerBloqueo,
  registrarBloqueo,
};