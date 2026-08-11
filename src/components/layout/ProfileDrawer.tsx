import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { Icon } from "../ui/Icon";

export function ProfileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const fullName = typeof user?.user_metadata.full_name === "string" && user.user_metadata.full_name.trim()
    ? user.user_metadata.full_name.trim()
    : "Tu perfil";
  const initials = fullName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "NV";

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  const goTo = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      onClose();
      navigate("/ingresar", { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className={`profile-drawer-layer ${open ? "open" : ""}`} aria-hidden={!open}>
      <button className="profile-drawer-backdrop" type="button" aria-label="Cerrar perfil" onClick={onClose} />
      <aside className="profile-drawer" aria-label="Perfil" aria-modal="true" role="dialog">
        <div className="profile-drawer-user">
          <div className="large-avatar">{initials}</div>
          <div><h2>{fullName}</h2><p>{user?.email}</p></div>
        </div>
        <nav className="profile-drawer-menu">
          <button type="button" onClick={() => goTo("/datos-personales")}>
            <span><Icon name="user" size={21} /></span><strong>Datos personales</strong><Icon name="chevronRight" size={18} />
          </button>
          <button type="button" onClick={() => goTo("/ajustes-notificaciones")}>
            <span><Icon name="bell" size={21} /></span><strong>Notificaciones</strong><Icon name="chevronRight" size={18} />
          </button>
        </nav>
        <button className="profile-drawer-signout" type="button" disabled={signingOut} onClick={() => void handleSignOut()}>
          {signingOut ? "Cerrando..." : "Cerrar sesión"}
        </button>
      </aside>
    </div>
  );
}
