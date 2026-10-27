import { useEffect, useMemo, useState } from "react";
import { obtenerDetalleAlianza } from "../services/api";
import { obtenerPais } from "../utils/paises";
import { obtenerHorarios } from "../utils/horarios";
import { obtenerColorHorario } from "../utils/coloresHorarios";
import "./AnalisisBallenas.css";

const FILTROS = [10, 20, 50, "todos"];

function formatearTHP(valor) {
  if (!Number.isFinite(valor)) return "—";

  return new Intl.NumberFormat("es-ES", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(valor);
}

function leerTHP(jugador) {
  if (jugador.thp === null || jugador.thp === undefined || jugador.thp === "") {
    return null;
  }

  const numero = Number(jugador.thp);

  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

function nombreComandante(jugador) {
  return (
    jugador.nombre ||
    jugador.comandante ||
    jugador.name ||
    "Comandante sin nombre"
  );
}

function TarjetaBandera({ grupo, totalTHP }) {
  const [expandida, setExpandida] = useState(false);

  const comandantesVisibles = expandida
    ? grupo.listaComandantes
    : grupo.listaComandantes.slice(0, 3);

  const restantes = Math.max(0, grupo.listaComandantes.length - 3);

  return (
    <article
      className="ballenas-tarjeta"
      style={{
        "--color-region": obtenerColorHorario(grupo.codigo),
      }}
    >
      <div className="ballenas-tarjeta-cabecera">
        <div className="ballenas-tarjeta-pais">
          <span className="ballenas-tarjeta-bandera">{grupo.bandera}</span>
          <h3>{grupo.nombre}</h3>
        </div>

        <span className="ballenas-tarjeta-porcentaje-jugadores">
          {grupo.porcentajeJugadores.toFixed(1)}% jugadores
        </span>
      </div>

      <div className="ballenas-tarjeta-cifras">
        <div className="ballenas-tarjeta-cifra">
          <strong>{grupo.jugadores}</strong>
          <span>Jugadores</span>
        </div>

        <div className="ballenas-tarjeta-cifra derecha">
          <strong>{grupo.conTHP ? formatearTHP(grupo.thp) : "—"}</strong>
          <span>
            {grupo.conTHP && totalTHP > 0
              ? `${grupo.porcentajeTHP.toFixed(1)}% del THP`
              : "THP desconocido"}
          </span>
        </div>
      </div>

      <div className="ballenas-tarjeta-horarios">
        <h4>Horarios locales de guerra</h4>

        <div className="ballenas-horarios-grid">
          {grupo.horarios.map((hora, indice) => (
            <div className="ballenas-horario" key={indice}>
              <span>{["07:00", "15:00", "23:00"][indice]} EU</span>
              <strong>{hora}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="ballenas-tarjeta-comandantes">
        <div className="ballenas-comandantes-titulo">
          <h4>Comandantes más fuertes</h4>
          <span>THP individual</span>
        </div>

        <div className="ballenas-lista-comandantes">
          {comandantesVisibles.map((jugador, indice) => {
            const thp = leerTHP(jugador);

            return (
              <div
                className="ballenas-comandante"
                key={`${jugador.id ?? jugador.nombre ?? indice}-${indice}`}
              >
                <span className="ballenas-comandante-nombre">
                  <span className="ballenas-comandante-posicion">
                    {indice + 1}.
                  </span>
                  <span translate="no">{nombreComandante(jugador)}</span>
                </span>

                <strong className="ballenas-comandante-thp">
                  {thp === null ? "Sin datos" : formatearTHP(thp)}
                </strong>
              </div>
            );
          })}
        </div>
      </div>

      {restantes > 0 && (
        <button
          type="button"
          className="ballenas-boton-expandir"
          onClick={() => setExpandida((anterior) => !anterior)}
          aria-expanded={expandida}
        >
          {expandida ? "Mostrar menos" : `Ver ${restantes} comandantes más`}

          <span aria-hidden="true">{expandida ? "▲" : "▼"}</span>
        </button>
      )}
    </article>
  );
}

export default function AnalisisBallenas({ alianzasSeleccionadas = [] }) {
  const [alianzaId, setAlianzaId] = useState("");
  const [filtro, setFiltro] = useState(10);
  const [vista, setVista] = useState("tarjetas");
  const [jugadores, setJugadores] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const alianzas = useMemo(
    () =>
      alianzasSeleccionadas.map((alianza) => ({
        ...alianza,
        id: String(alianza.id),
      })),
    [alianzasSeleccionadas],
  );

  useEffect(() => {
    if (!alianzas.some((a) => a.id === alianzaId)) {
      setAlianzaId(alianzas[0]?.id ?? "");
    }
  }, [alianzas, alianzaId]);

  useEffect(() => {
    if (!alianzaId) {
      setJugadores([]);
      return;
    }

    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError("");
      setJugadores([]);

      try {
        const resultado = await obtenerDetalleAlianza(alianzaId);

        const lista = Array.isArray(resultado)
          ? resultado
          : resultado?.jugadores;

        if (!Array.isArray(lista)) {
          throw new Error("No se encontró la lista de comandantes.");
        }

        if (!cancelado) {
          setJugadores(lista);
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message || "Error al cargar la alianza.");
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    cargar();

    return () => {
      cancelado = true;
    };
  }, [alianzaId]);

  const analisis = useMemo(() => {
    const ordenados = [...jugadores].sort((a, b) => {
      const thpA = leerTHP(a);
      const thpB = leerTHP(b);

      if (thpA === null && thpB === null) return 0;
      if (thpA === null) return 1;
      if (thpB === null) return -1;

      return thpB - thpA;
    });

    const seleccionados =
      filtro === "todos" ? ordenados : ordenados.slice(0, filtro);

    const totalJugadores = seleccionados.length;

    const conTHP = seleccionados.filter(
      (jugador) => leerTHP(jugador) !== null,
    ).length;

    const totalTHP = seleccionados.reduce(
      (suma, jugador) => suma + (leerTHP(jugador) ?? 0),
      0,
    );

    const grupos = new Map();

    for (const jugador of seleccionados) {
      const codigo = String(jugador.bandera || "UN").toUpperCase();

      const pais = obtenerPais(codigo);

      if (!grupos.has(codigo)) {
        grupos.set(codigo, {
          codigo,
          nombre: pais.nombre,
          bandera: pais.bandera,
          jugadores: 0,
          thp: 0,
          conTHP: 0,
          listaComandantes: [],
        });
      }

      const grupo = grupos.get(codigo);
      const thp = leerTHP(jugador);

      grupo.jugadores += 1;
      grupo.listaComandantes.push(jugador);

      if (thp !== null) {
        grupo.thp += thp;
        grupo.conTHP += 1;
      }
    }

    const distribucion = [...grupos.values()]
      .map((grupo) => ({
        ...grupo,
        horarios: obtenerHorarios(grupo.codigo),
        porcentajeJugadores: totalJugadores
          ? (grupo.jugadores / totalJugadores) * 100
          : 0,
        porcentajeTHP: totalTHP ? (grupo.thp / totalTHP) * 100 : 0,
      }))
      .sort(
        (a, b) =>
          b.thp - a.thp ||
          b.jugadores - a.jugadores ||
          a.nombre.localeCompare(b.nombre, "es"),
      );

    return {
      totalJugadores,
      totalTHP,
      conTHP,
      sinTHP: totalJugadores - conTHP,
      distribucion,
    };
  }, [jugadores, filtro]);

  const alianzaActual = alianzas.find((alianza) => alianza.id === alianzaId);

  return (
    <section className="analisis-ballenas">
      <header className="ballenas-cabecera">
        <div>
          <h2>🐳 Análisis de ballenas</h2>
        </div>
      </header>

      {alianzas.length === 0 ? (
        <p className="ballenas-aviso">Selecciona una alianza para comenzar.</p>
      ) : (
        <>
          <div className="ballenas-controles">
            <label>
              Alianza
              <select
                value={alianzaId}
                onChange={(e) => setAlianzaId(e.target.value)}
              >
                {alianzas.map((alianza) => (
                  <option key={alianza.id} value={alianza.id} translate="no">
                    {alianza.etiqueta ? `[${alianza.etiqueta}] ` : ""}
                    {alianza.nombre || alianza.id}
                    {" · "}#{alianza.servidor || "?"}
                  </option>
                ))}
              </select>
            </label>

            <div className="ballenas-filtros">
              {FILTROS.map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  className={filtro === opcion ? "activo" : ""}
                  onClick={() => setFiltro(opcion)}
                >
                  {opcion === "todos" ? "Todos" : `TOP ${opcion}`}
                </button>
              ))}
            </div>
          </div>

          {cargando && <p>Cargando comandantes...</p>}

          {error && <p className="ballenas-error">{error}</p>}

          {!cargando && !error && alianzaActual && (
            <>
              <div className="ballenas-resumen">
                <div>
                  <strong>{analisis.totalJugadores}</strong>
                  <span>Comandantes</span>
                </div>

                <div>
                  <strong>{analisis.distribucion.length}</strong>
                  <span>Banderas distintas</span>
                </div>

                <div>
                  <strong>{formatearTHP(analisis.totalTHP)}</strong>
                  <span>THP conocido</span>
                </div>
              </div>

              {analisis.sinTHP > 0 && (
                <p className="ballenas-aviso">
                  ⚠️ {analisis.sinTHP} comandante(s) sin THP. Los porcentajes de
                  THP se calculan únicamente sobre el poder conocido. El TOP se
                  ordena por los valores disponibles.
                </p>
              )}

              <div className="ballenas-vistas">
                <button
                  type="button"
                  className={vista === "tarjetas" ? "activo" : ""}
                  onClick={() => setVista("tarjetas")}
                >
                  ▦ Tarjetas
                </button>

                <button
                  type="button"
                  className={vista === "tabla" ? "activo" : ""}
                  onClick={() => setVista("tabla")}
                >
                  ☷ Tabla
                </button>
              </div>

              {vista === "tarjetas" ? (
                <div className="ballenas-tarjetas-grid">
                  {analisis.distribucion.map((grupo) => (
                    <TarjetaBandera
                      key={`${alianzaId}-${filtro}-${grupo.codigo}`}
                      grupo={grupo}
                      totalTHP={analisis.totalTHP}
                    />
                  ))}
                </div>
              ) : (
                <div className="ballenas-tabla-contenedor">
                  <table className="ballenas-tabla">
                    <thead>
                      <tr>
                        <th>Bandera</th>
                        <th>Jugadores</th>
                        <th>% jugadores</th>
                        <th>THP total</th>
                        <th>% THP</th>
                        <th>07:00 EU</th>
                        <th>15:00 EU</th>
                        <th>23:00 EU</th>
                      </tr>
                    </thead>

                    <tbody>
                      {analisis.distribucion.map((grupo) => (
                        <tr key={grupo.codigo}>
                          <td>
                            {grupo.bandera} {grupo.nombre}
                          </td>

                          <td>
                            <strong>{grupo.jugadores}</strong>
                          </td>

                          <td>
                            <div className="ballenas-barra-dato">
                              <div className="ballenas-barra">
                                <span
                                  style={{
                                    width: `${grupo.porcentajeJugadores}%`,
                                  }}
                                />
                              </div>
                              <span>
                                {grupo.porcentajeJugadores.toFixed(1)}%
                              </span>
                            </div>
                          </td>

                          <td>
                            {grupo.conTHP ? formatearTHP(grupo.thp) : "—"}
                          </td>

                          <td>
                            <div className="ballenas-barra-dato">
                              <div className="ballenas-barra thp">
                                <span
                                  style={{
                                    width: `${grupo.porcentajeTHP}%`,
                                  }}
                                />
                              </div>
                              <span>
                                {grupo.conTHP && analisis.totalTHP
                                  ? `${grupo.porcentajeTHP.toFixed(1)}%`
                                  : "—"}
                              </span>
                            </div>
                          </td>

                          {grupo.horarios.map((hora, indice) => (
                            <td key={indice}>{hora}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="ballenas-nota">
                Las banderas son elegidas por los jugadores y no confirman su
                nacionalidad ni ubicación. Los horarios son aproximados y no
                indican cuándo están conectados.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
