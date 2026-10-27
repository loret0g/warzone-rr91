import { useEffect, useState } from "react";
import SelectorAlianzas from "./components/SelectorAlianzas";
import RankingComandantes from "./components/RankingComandantes";
import AnalisisBallenas from "./components/AnalisisBallenas";
import "./App.css";

function Icono({ nombre, size = 22 }) {
  const propiedades = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (nombre === "radar") {
    return (
      <svg {...propiedades}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
        <path d="M12 12l6.4-6.4" />
      </svg>
    );
  }

  if (nombre === "shield") {
    return (
      <svg {...propiedades}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      </svg>
    );
  }

  if (nombre === "chart") {
    return (
      <svg {...propiedades}>
        <path d="M4 20V12" />
        <path d="M10 20V7" />
        <path d="M16 20V4" />
        <path d="M22 20H2" />
      </svg>
    );
  }

  if (nombre === "trophy") {
    return (
      <svg {...propiedades}>
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="M7 4h10v7a5 5 0 0 1-10 0V4Z" />
        <path d="M7 6H4v3a4 4 0 0 0 4 4" />
        <path d="M17 6h3v3a4 4 0 0 1-4 4" />
      </svg>
    );
  }

  return null;
}

function SeccionPlegable({ titulo, subtitulo, icono, color, children }) {
  const [abierta, setAbierta] = useState(false);

  return (
    <section className={`seccion-plegable seccion-${color}`}>
      <button
        type="button"
        className="seccion-plegable-cabecera"
        onClick={() => setAbierta((anterior) => !anterior)}
        aria-expanded={abierta}
      >
        <span className="seccion-plegable-icono">
          <Icono nombre={icono} />
        </span>

        <span className="seccion-plegable-textos">
          <span className="seccion-plegable-titulo">{titulo}</span>

          <span className="seccion-plegable-subtitulo">{subtitulo}</span>
        </span>

        <svg
          className={`seccion-plegable-flecha ${abierta ? "abierta" : ""}`}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Conservamos montado el componente
          para no perder filtros ni selecciones. */}
      <div className="seccion-plegable-contenido" hidden={!abierta}>
        {children}
      </div>
    </section>
  );
}

function AvisoBallenas({ hasta }) {
  const calcularRestante = () =>
    Math.max(0, new Date(hasta).getTime() - Date.now());

  const [restante, setRestante] = useState(calcularRestante);

  useEffect(() => {
    const actualizar = () => {
      setRestante(calcularRestante());
    };

    actualizar();

    const intervalo = setInterval(actualizar, 1000);

    return () => clearInterval(intervalo);
  }, [hasta]);

  const segundosTotales = Math.ceil(restante / 1000);

  const horas = Math.floor(segundosTotales / 3600);
  const minutos = Math.floor((segundosTotales % 3600) / 60);
  const segundos = segundosTotales % 60;

  const formato = (numero) => String(numero).padStart(2, "0");

  return (
    <div className="aviso-ballenas" role="status">
      <span className="aviso-ballenas-icono">🐳</span>

      <div>
        <strong>¡Las ballenas se han ido a dormir!</strong>

        <p>
          Hemos alcanzado el límite de consultas por hoy, pero seguimos espiando
          con los últimos datos guardados. 👀
        </p>

        <p className="aviso-ballenas-hora">
          💤 Volverán a despertar en{" "}
          <span className="cuenta-atras-ballenas">
            {formato(horas)}:{formato(minutos)}:{formato(segundos)}
          </span>
        </p>
      </div>
    </div>
  );
}

function App() {
  const [alianzasSeleccionadas, setAlianzasSeleccionadas] = useState([]);

  const [bloqueoLastIntel, setBloqueoLastIntel] = useState(null);
  useEffect(() => {
    if (!bloqueoLastIntel) return;

    const comprobarDesbloqueo = () => {
      if (Date.now() >= new Date(bloqueoLastIntel).getTime()) {
        setBloqueoLastIntel(null);
      }
    };

    comprobarDesbloqueo();

    const intervalo = setInterval(comprobarDesbloqueo, 10000);

    return () => clearInterval(intervalo);
  }, [bloqueoLastIntel]);

  useEffect(() => {
    let activo = true;

    async function comprobarEstado() {
      try {
        const respuesta = await fetch("/api/lastintel/estado");

        if (!respuesta.ok) return;

        const datos = await respuesta.json();

        if (activo) {
          setBloqueoLastIntel(datos.bloqueado ? datos.hasta : null);
        }
      } catch (error) {
        console.warn("No se pudo consultar el estado de LastIntel:", error);
      }
    }

    // Consultamos el estado local al entrar.
    comprobarEstado();

    // Actualizamos al regresar a la pestaña.
    function alVolver() {
      if (document.visibilityState === "visible") {
        comprobarEstado();
      }
    }

    // Los componentes pueden avisar de un bloqueo.
    function alDetectarBloqueo() {
      comprobarEstado();
    }

    document.addEventListener("visibilitychange", alVolver);

    window.addEventListener("lastintel:bloqueado", alDetectarBloqueo);

    return () => {
      activo = false;

      document.removeEventListener("visibilitychange", alVolver);

      window.removeEventListener("lastintel:bloqueado", alDetectarBloqueo);
    };
  }, []);

  return (
    <main className="app">
      <header className="app-cabecera">
        <div className="app-temporada">
          <Icono nombre="radar" size={19} />
          <span>SEASON 5</span>
        </div>

        <h1>
          Warzone <span>RR91</span>
        </h1>
      </header>

      {bloqueoLastIntel && <AvisoBallenas hasta={bloqueoLastIntel} />}

      <div className="app-secciones">
        <SeccionPlegable
          titulo="Seleccionar alianzas"
          subtitulo="Servidores y alianzas"
          icono="shield"
          color="azul"
        >
          <SelectorAlianzas
            seleccionadas={alianzasSeleccionadas}
            onChange={setAlianzasSeleccionadas}
          />
        </SeccionPlegable>

        <SeccionPlegable
          titulo="Análisis de ballenas"
          subtitulo="THP, banderas y horarios"
          icono="chart"
          color="violeta"
        >
          <AnalisisBallenas alianzasSeleccionadas={alianzasSeleccionadas} />
        </SeccionPlegable>

        <SeccionPlegable
          titulo="Ranking THP"
          subtitulo="Clasificación global por THP"
          icono="trophy"
          color="dorado"
        >
          <RankingComandantes alianzasSeleccionadas={alianzasSeleccionadas} />
        </SeccionPlegable>
      </div>
    </main>
  );
}

export default App;
