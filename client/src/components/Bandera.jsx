import "flag-icons/css/flag-icons.min.css";

export default function Bandera({ codigo, nombre = "", className = "" }) {
  const pais = String(codigo || "").trim().toLowerCase();

  if (!/^[a-z]{2}$/.test(pais) || pais === "un") {
    return <span aria-label={nombre || "Bandera desconocida"}>🌐</span>;
  }

  return (
    <span
      className={`fi fi-${pais} ${className}`}
      role="img"
      aria-label={nombre || pais.toUpperCase()}
      style={{
        display: "inline-block",
        width: "1.4em",
        height: "1.05em",
        flexShrink: 0,
        verticalAlign: "middle",
        borderRadius: "2px",
      }}
    />
  );
}