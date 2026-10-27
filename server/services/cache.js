const fs = require("node:fs/promises");
const path = require("node:path");

const CARPETA = path.join(__dirname, "..", "cache");
const ZONA_HORARIA = "Europe/Madrid";

const ARCHIVO_BLOQUEO = path.join(
  CARPETA,
  "estado_lastintel.json"
);

const pendientes = new Map();

function fechaActual() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function rutaArchivo(clave) {
  const nombreSeguro = clave.replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  );

  return path.join(CARPETA, `${nombreSeguro}.json`);
}

async function leerJSON(archivo) {
  try {
    const contenido = await fs.readFile(
      archivo,
      "utf8"
    );

    return JSON.parse(contenido);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(
        `[CACHE] No se pudo leer ${archivo}:`,
        error.message
      );
    }

    return null;
  }
}

async function guardarJSON(archivo, contenido) {
  await fs.mkdir(CARPETA, { recursive: true });

  const temporal = `${archivo}.${process.pid}.tmp`;

  try {
    await fs.writeFile(
      temporal,
      JSON.stringify(contenido, null, 2),
      "utf8"
    );

    await fs.rename(temporal, archivo);
  } finally {
    await fs.rm(temporal, { force: true }).catch(() => {});
  }
}

async function leerCache(clave) {
  return leerJSON(rutaArchivo(clave));
}

async function guardarCache(clave, datos) {
  const contenido = {
    fecha: fechaActual(),
    actualizadoEn: new Date().toISOString(),
    datos,
  };

  await guardarJSON(rutaArchivo(clave), contenido);
}

async function obtenerBloqueo() {
  const estado = await leerJSON(ARCHIVO_BLOQUEO);

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
    return;
  }

  const hasta = new Date(
    Date.now() + duracion * 1000
  ).toISOString();

  await guardarJSON(ARCHIVO_BLOQUEO, {
    motivo: "limite_diario",
    hasta,
  });

  console.warn(
    `[LASTINTEL] Cupo agotado. Disponible de nuevo: ${hasta}`
  );
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
  // Si ya existe una consulta de esta misma clave,
  // compartimos su resultado.
  if (pendientes.has(clave)) {
    return pendientes.get(clave);
  }

  const peticion = (async () => {
    const guardado = await leerCache(clave);
    const hoy = fechaActual();

    // La información de hoy se reutiliza.
    if (guardado?.fecha === hoy) {
      return guardado.datos;
    }

    // Si LastIntel está bloqueado, no consultamos.
    const bloqueo = await obtenerBloqueo();

    if (bloqueo) {
      if (guardado) {
        console.log(
          `[CACHE] Datos guardados: ${clave}`
        );

        return guardado.datos;
      }

      throw crearErrorBloqueo(bloqueo);
    }

    try {
      const datos = await consultar();

      await guardarCache(clave, datos);

      console.log(
        `[CACHE] Actualizada: ${clave}`
      );

      return datos;
    } catch (error) {
      // Solo bloqueamos si LastIntel confirma
      // que se ha agotado el cupo anónimo.
      if (
        error.codigo === "LASTINTEL_LIMITE_DIARIO" &&
        error.retryAfterSeconds
      ) {
        await registrarBloqueo(
          error.retryAfterSeconds
        );
      }

      // Si hay información antigua, la conservamos.
      if (guardado) {
        console.warn(
          `[CACHE] Error al actualizar ${clave}. ` +
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