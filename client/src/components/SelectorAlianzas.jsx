import { useEffect, useState } from "react";
import { obtenerAlianzas } from "../services/api";
import "./SelectorAlianzas.css";

const SERVIDORES = [1451, 1468, 1490, 1497, 1535, 1541, 1542];

function SelectorAlianzas({ seleccionadas, onChange }) {
  const [servidor, setServidor] = useState(1451);
  const [alianzas, setAlianzas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;

    async function cargarAlianzas() {
      setCargando(true);
      setError(null);
      setAlianzas([]);

      try {
        const datos = await obtenerAlianzas(servidor);

        if (activo) {
          setAlianzas(datos);
        }
      } catch (err) {
        if (activo) {
          setError(err.message);
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarAlianzas();

    return () => {
      activo = false;
    };
  }, [servidor]);

  function alternarAlianza(alianza) {
    const existe = seleccionadas.some((item) => item.id === alianza.id);

    if (existe) {
      onChange(seleccionadas.filter((item) => item.id !== alianza.id));
    } else {
      onChange([...seleccionadas, alianza]);
    }
  }

  const filtradas = alianzas.filter((alianza) => {
    const texto = `${alianza.nombre} ${alianza.etiqueta}`.toLowerCase();

    return texto.includes(busqueda.toLowerCase().trim());
  });

  return (
    <section className="selector-alianzas">
      <h2>Seleccionar alianzas</h2>

      <div className="selector-controles">
        <div>
          <label htmlFor="servidor-alianzas">Servidor</label>
          <select
            id="servidor-alianzas"
            value={servidor}
            onChange={(e) => {
              setServidor(Number(e.target.value));
              setBusqueda("");
            }}
          >
            {SERVIDORES.map((numero) => (
              <option key={numero} value={numero}>
                #{numero}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="buscar-alianza">Buscar alianza</label>
          <input
            id="buscar-alianza"
            type="search"
            placeholder="Nombre o etiqueta..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {cargando && <p>Cargando alianzas...</p>}
      {error && <p role="alert">{error}</p>}

      {!cargando && !error && (
        <div className="lista-alianzas">
          {filtradas.map((alianza) => {
            const marcada = seleccionadas.some(
              (item) => item.id === alianza.id,
            );

            return (
              <label className="alianza-opcion" key={alianza.id}>
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={() => alternarAlianza(alianza)}
                />

                <span className="alianza-datos">
                  <strong translate="no">
                    [{alianza.etiqueta}] {alianza.nombre}
                  </strong>
                  <small>
                    {alianza.miembros} miembros ·{" "}
                    {alianza.poder.toLocaleString("es-ES")} poder
                  </small>
                </span>
              </label>
            );
          })}

          {filtradas.length === 0 && <p>No se encontraron alianzas.</p>}
        </div>
      )}

      <div className="seleccion-resumen">
        <h3>Alianzas seleccionadas ({seleccionadas.length})</h3>

        {seleccionadas.length === 0 ? (
          <p>Todavía no has seleccionado ninguna alianza.</p>
        ) : (
          <div className="seleccion-etiquetas">
            {seleccionadas.map((alianza) => (
              <button
                key={alianza.id}
                type="button"
                onClick={() => alternarAlianza(alianza)}
                title="Quitar alianza"
              >
                <span translate="no">
                  #{alianza.servidor} [{alianza.etiqueta}] ×
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default SelectorAlianzas;
