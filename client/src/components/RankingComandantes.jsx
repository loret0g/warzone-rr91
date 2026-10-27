import { useEffect, useMemo, useState } from "react";
import { obtenerDetalleAlianza } from "../services/api";
import { obtenerPais } from "../utils/paises";
import { obtenerHorarios } from "../utils/horarios";
import { obtenerColorHorario } from "../utils/coloresHorarios";
import "./RankingComandantes.css";

const FILTROS = [10, 20, 50, "todos"];

function RankingComandantes({ alianzasSeleccionadas = [] }) {
  const [jugadores, setJugadores] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // TOP 20 por defecto.
  const [filtro, setFiltro] = useState(20);

  useEffect(() => {
    let activo = true;

    async function cargarJugadores() {
      if (alianzasSeleccionadas.length === 0) {
        setJugadores([]);
        setError(null);
        setCargando(false);
        return;
      }

      setCargando(true);
      setError(null);

      try {
        const resultados = await Promise.allSettled(
          alianzasSeleccionadas.map((alianza) =>
            obtenerDetalleAlianza(alianza.id),
          ),
        );

        if (!activo) return;

        const correctos = resultados
          .filter((resultado) => resultado.status === "fulfilled")
          .map((resultado) => resultado.value);

        const fallidos = resultados.filter(
          (resultado) => resultado.status === "rejected",
        );

        const todosLosJugadores = correctos.flatMap((alianza) =>
          Array.isArray(alianza) ? alianza : (alianza?.jugadores ?? []),
        );

        // Ordenamos todos los comandantes por THP.
        // Los que no tienen THP quedan al final.
        todosLosJugadores.sort((a, b) => {
          const thpA =
            a.thp === null || a.thp === undefined || a.thp === ""
              ? null
              : Number(a.thp);

          const thpB =
            b.thp === null || b.thp === undefined || b.thp === ""
              ? null
              : Number(b.thp);

          const validoA = thpA !== null && Number.isFinite(thpA) && thpA >= 0;

          const validoB = thpB !== null && Number.isFinite(thpB) && thpB >= 0;

          if (!validoA && !validoB) return 0;
          if (!validoA) return 1;
          if (!validoB) return -1;

          return thpB - thpA;
        });

        setJugadores(todosLosJugadores);

        if (fallidos.length > 0) {
          setError(
            `No se pudieron cargar ${fallidos.length} alianzas. ` +
              "El ranking mostrado está incompleto.",
          );
        }
      } catch (err) {
        if (activo) {
          setError(err.message || "Error al cargar los comandantes.");
          setJugadores([]);
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarJugadores();

    return () => {
      activo = false;
    };
  }, [alianzasSeleccionadas]);

  // Aplicamos el filtro después de ordenar
  // el ranking conjunto de comandantes.
  const jugadoresVisibles = useMemo(() => {
    if (filtro === "todos") {
      return jugadores;
    }

    return jugadores.slice(0, filtro);
  }, [jugadores, filtro]);

  function formatearTHP(valor) {
    if (valor === null || valor === undefined || valor === "") {
      return "—";
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero) || numero < 0) {
      return "—";
    }

    return (
      (numero / 1_000_000).toLocaleString("es-ES", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) + " M"
    );
  }

  return (
    <section className="ranking-comandantes">
      <h2>Ranking conjunto de comandantes</h2>

      {alianzasSeleccionadas.length === 0 ? (
        <p>Selecciona al menos una alianza para ver sus comandantes.</p>
      ) : (
        <>
          {cargando && <p>Cargando comandantes...</p>}

          {error && (
            <p className="ranking-error" role="alert">
              {error}
            </p>
          )}

          {!cargando && (
            <>
              <p className="ranking-resumen">
                {jugadores.length} comandantes obtenidos de{" "}
                {alianzasSeleccionadas.length} alianzas seleccionadas.
              </p>

              {/* FILTROS TOP */}
              <div
                className="ranking-filtros"
                role="group"
                aria-label="Filtrar ranking de comandantes"
              >
                {FILTROS.map((opcion) => (
                  <button
                    key={opcion}
                    type="button"
                    className={filtro === opcion ? "activo" : ""}
                    aria-pressed={filtro === opcion}
                    onClick={() => setFiltro(opcion)}
                  >
                    {opcion === "todos" ? "Todos" : `TOP ${opcion}`}
                  </button>
                ))}
              </div>

              <p className="ranking-mostrando">
                Mostrando <strong>{jugadoresVisibles.length}</strong> de{" "}
                <strong>{jugadores.length}</strong> comandantes.
              </p>

              <div className="ranking-tabla-contenedor">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Comandante</th>
                      <th>Servidor</th>
                      <th>Alianza</th>
                      <th>País / región</th>
                      <th>Nivel</th>
                      <th>THP</th>
                      <th>07:00 Europa</th>
                      <th>15:00 Europa</th>
                      <th>23:00 Europa</th>
                    </tr>
                  </thead>

                  <tbody>
                    {jugadoresVisibles.map((jugador, indice) => {
                      const pais = obtenerPais(jugador.bandera);

                      const horarios = obtenerHorarios(jugador.bandera);

                      const colorHorario = obtenerColorHorario(jugador.bandera);

                      return (
                        <tr
                          key={`${jugador.servidor}-${jugador.id}-${indice}`}
                          style={{
                            "--color-region": colorHorario,
                          }}
                        >
                          <td>{indice + 1}</td>

                          <td translate="no">{jugador.nombre}</td>

                          <td>#{jugador.servidor}</td>

                          <td>
                            <td translate="no">[{jugador.alianza}]</td>
                          </td>

                          <td>
                            <span className="ranking-pais">
                              {pais.bandera} {pais.nombre}
                            </span>
                          </td>

                          <td>{jugador.nivel ?? "—"}</td>

                          <td>{formatearTHP(jugador.thp)}</td>

                          {horarios.map((hora, indiceHorario) => (
                            <td key={indiceHorario} className="ranking-horario">
                              {hora}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

export default RankingComandantes;
