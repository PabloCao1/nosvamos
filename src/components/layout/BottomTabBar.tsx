import { NavLink } from "react-router-dom";
import type { IconName } from "../ui/Icon";
import { Icon } from "../ui/Icon";

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: "/", label: "Viajes", icon: "suitcase" },
  { to: "/notificaciones", label: "Avisos", icon: "bell" },
  { to: "/perfil", label: "Perfil", icon: "user" },
];

export function BottomTabBar() {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <div className="bottom-nav-inner">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className={({ isActive }) => `tab-link ${isActive ? "active" : ""}`}
          >
            {({ isActive }) => (
              <>
                <span className="tab-icon">
                  <Icon name={tab.icon} size={22} weight={isActive ? "Filled" : "Outline"} />
                </span>
                <span>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
