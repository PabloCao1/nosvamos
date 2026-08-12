import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import type { IconName } from "../ui/Icon";
import { Icon } from "../ui/Icon";

type CreateMode = "trip" | "activity" | "expense" | "reservation" | "lodging" | "transport" | "car" | "invite" | "import";

interface FabAction {
  label: string;
  icon: IconName;
  mode: CreateMode;
}

const tripDetailActions: FabAction[] = [
  { label: "Escanear documento", icon: "receipt", mode: "import" },
  { label: "Invitar integrante", icon: "users", mode: "invite" },
  { label: "Agregar traslado", icon: "airplane", mode: "transport" },
  { label: "Alquiler de auto", icon: "suitcase", mode: "car" },
  { label: "Agregar alojamiento", icon: "bed", mode: "lodging" },
  { label: "Agregar actividad", icon: "calendar", mode: "activity" },
  { label: "Agregar gasto", icon: "wallet", mode: "expense" },
];

function actionForPath(pathname: string): FabAction | null {
  if (pathname === "/") {
    return { label: "Crear nuevo viaje", icon: "suitcase", mode: "trip" };
  }

  if (pathname === "/itinerario" || /^\/viaje\/[^/]+\/itinerario$/.test(pathname)) {
    return { label: "Agregar actividad", icon: "calendar", mode: "activity" };
  }

  if (pathname === "/gastos" || /^\/viaje\/[^/]+\/gastos$/.test(pathname)) {
    return { label: "Agregar gasto", icon: "wallet", mode: "expense" };
  }

  if (pathname === "/reservas" || /^\/viaje\/[^/]+\/reservas$/.test(pathname)) {
    return { label: "Agregar reserva", icon: "ticket", mode: "reservation" };
  }

  if (/^\/viaje\/[^/]+\/integrantes$/.test(pathname)) {
    return { label: "Agregar integrante", icon: "users", mode: "invite" };
  }

  return null;
}

export function FloatingActionButton() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const action = actionForPath(pathname);
  const isTripDetail = /^\/viaje\/[^/]+$/.test(pathname) || pathname === "/viaje";
  const isMembersPage = /^\/viaje\/[^/]+\/integrantes$/.test(pathname);
  const tripId = pathname.match(/^\/viaje\/([^/]+)/)?.[1];
  const formPath = (mode: CreateMode) =>
    mode === "import" && tripId ? `/viaje/${tripId}/importar` : tripId ? `/viaje/${tripId}/nuevo/${mode}` : `/nuevo/${mode}`;

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!action && !isTripDetail) return null;

  if (pathname === "/") {
    return (
      <>
        {menuOpen && (
          <button
            className="fab-menu-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar acciones de viajes"
          />
        )}
        <div className={`fab-bubbles ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
          <button
            className="fab-bubble"
            onClick={() => {
              setMenuOpen(false);
              navigate("/viajes/nuevo");
            }}
            tabIndex={menuOpen ? 0 : -1}
          >
            <span className="fab-bubble-label">Nuevo viaje</span>
            <span className="fab-bubble-icon"><Icon name="suitcase" size={21} /></span>
          </button>
        </div>
        <button
          className={`fab ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen((current) => !current)}
          aria-label="Abrir acciones de viajes"
          aria-expanded={menuOpen}
        >
          <Icon name="plus" size={27} />
        </button>
      </>
    );
  }

  if (isTripDetail) {
    return (
      <>
        {menuOpen && (
          <button
            className="fab-menu-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar acciones del viaje"
          />
        )}
        <div className={`fab-bubbles ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
          {tripDetailActions.map((item, index) => (
            <button
              className="fab-bubble"
              key={item.label}
              onClick={() => {
                setMenuOpen(false);
                navigate(formPath(item.mode));
              }}
              tabIndex={menuOpen ? 0 : -1}
              style={{ "--bubble-index": index } as React.CSSProperties}
            >
              <span className="fab-bubble-label">{item.label}</span>
              <span className="fab-bubble-icon"><Icon name={item.icon} size={21} /></span>
            </button>
          ))}
        </div>
        <button
          className={`fab ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen((current) => !current)}
          aria-label="Abrir acciones del viaje"
          aria-expanded={menuOpen}
        >
          <Icon name="plus" size={27} />
        </button>
      </>
    );
  }

  if (isMembersPage && tripId) {
    return (
      <>
        {menuOpen && (
          <button
            className="fab-menu-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar acciones de integrantes"
          />
        )}
        <div className={`fab-bubbles ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
          <button
            className="fab-bubble"
            onClick={() => {
              setMenuOpen(false);
              navigate(`/viaje/${tripId}/integrantes/nuevo`);
            }}
            tabIndex={menuOpen ? 0 : -1}
          >
            <span className="fab-bubble-label">Agregar integrante</span>
            <span className="fab-bubble-icon"><Icon name="users" size={21} /></span>
          </button>
        </div>
        <button
          className={`fab ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen((current) => !current)}
          aria-label="Abrir acciones de integrantes"
          aria-expanded={menuOpen}
        >
          <Icon name="plus" size={27} />
        </button>
      </>
    );
  }

  return (
    <button
      className="fab"
      onClick={() => navigate(formPath(action!.mode))}
      aria-label={action!.label}
      title={action!.label}
    >
      <Icon name="plus" size={27} />
    </button>
  );
}
