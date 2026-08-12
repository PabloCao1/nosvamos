import { PageHeader } from "../components/layout/PageHeader";
import { Icon, type IconName } from "../components/ui/Icon";
import { Button, IconButton } from "../components/ui/Button";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useNotificationPreferences } from "../hooks/useNotificationPreferences";
import type { NotificationPreferences } from "../lib/push/notificationPreferences";
import { useInstallStore } from "../stores/installStore";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useAvatarUrl } from "../hooks/useAvatarUrl";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));

const settings: { icon: IconName; label: string; value: string }[] = [
  { icon: "wallet", label: "Moneda principal", value: "USD" },
  { icon: "clock", label: "Zona horaria", value: "Automática" },
  { icon: "map", label: "Idioma", value: "Español" },
  { icon: "cloudCheck", label: "Datos sin conexión", value: "1 viaje" },
];

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const setInstallOpen = useInstallStore((state) => state.setInstallOpen);
  const push = usePushNotifications();
  const notificationPreferences = useNotificationPreferences();
  const pushMessage = {
    ready: push.enabled
      ? "Recibirás avisos aunque NosVamos esté cerrada."
      : "Avisos de gastos, reservas y cambios del grupo.",
    "not-installed": "En iPhone, primero agregá NosVamos a la pantalla de inicio.",
    unsupported: "Este navegador no admite notificaciones web.",
    blocked: "El permiso está bloqueado. Activá NosVamos desde Ajustes > Notificaciones.",
    "not-configured": "Falta conectar el servicio de envío push.",
  }[push.availability];
  const fullName = typeof user?.user_metadata.full_name === "string" && user.user_metadata.full_name.trim()
    ? user.user_metadata.full_name.trim()
    : "Tu perfil";
  const initials = fullName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "NV";
  const avatarUrl = useAvatarUrl(typeof user?.user_metadata.avatar_path === "string" ? user.user_metadata.avatar_path : undefined);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/ingresar", { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Cuenta personal" title="Perfil" />
      <section className="profile-card">
        {avatarUrl ? <img className="large-avatar profile-avatar-image" src={avatarUrl} alt="Foto de perfil" /> : <div className="large-avatar">{initials}</div>}
        <div><h2>{fullName}</h2><p>{user?.email}</p></div>
        <IconButton icon="edit" label="Cambiar contraseña" size="small" onClick={() => navigate("/actualizar-clave")} />
      </section>

      <section className="section-block notification-preferences">
        <div className="section-heading"><div><p className="eyebrow">Avisos</p><h2>Qué querés recibir</h2></div></div>
        {([
          ["flights", "Vuelos", "Check-in y horario de salida"],
          ["transport", "Trenes y traslados", "Trenes, buses, ferries y autos"],
          ["lodging", "Alojamientos", "Ingreso a hoteles y departamentos"],
          ["activities", "Excursiones y actividades", "Reservas, restaurantes y eventos"],
          ["expenses", "Gastos", "Nuevos gastos y modificaciones"],
          ["groupChanges", "Cambios del grupo", "Contenido agregado o editado"],
          ["dayBefore", "El día anterior", "Primer recordatorio"],
          ["shortlyBefore", "Un rato antes", "Según el tipo de reserva"],
        ] as [keyof NotificationPreferences, string, string][]).map(([key, label, description]) => (
          <label className="notification-preference" key={key}>
            <span><strong>{label}</strong><small>{description}</small></span>
            <input
              type="checkbox"
              checked={Boolean(notificationPreferences.preferences[key])}
              onChange={(event) => notificationPreferences.update(key, event.target.checked)}
            />
          </label>
        ))}
      </section>

      {!isStandalone() && (
        <button className="install-card" onClick={() => setInstallOpen(true)}>
          <span><Icon name="suitcase" size={25} /></span>
          <div><strong>Instalá NosVamos</strong><p>Accedé rápido desde tu pantalla de inicio</p></div>
          <Icon name="chevronRight" size={19} />
        </button>
      )}

      <section className="push-card">
        <span className="push-card-icon"><Icon name="bell" size={24} /></span>
        <div>
          <strong>Notificaciones push</strong>
          <p>{pushMessage}</p>
          {push.error && <small role="alert">{push.error}</small>}
        </div>
        {push.availability === "ready" && (
          <button
            type="button"
            className={push.enabled ? "push-toggle active" : "push-toggle"}
            aria-label={push.enabled ? "Desactivar notificaciones" : "Activar notificaciones"}
            aria-pressed={push.enabled}
            disabled={push.pending}
            onClick={push.enabled ? push.disable : push.enable}
          >
            <span />
          </button>
        )}
        {push.availability === "not-installed" && (
          <Button size="small" variant="primary" onClick={() => setInstallOpen(true)}>Instalar</Button>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">Preferencias</p><h2>Tu experiencia</h2></div></div>
        <div className="settings-list">
          {settings.map((item) => (
            <button key={item.label}>
              <span><Icon name={item.icon} size={20} /></span>
              <p>{item.label}<small>{item.value}</small></p>
              <Icon name="chevronRight" size={18} />
            </button>
          ))}
        </div>
      </section>

      <section className="privacy-note">
        <Icon name="lock" size={21} />
        <div><strong>Tu cuenta está protegida</strong><p>La sesión y la contraseña se administran de forma segura con Supabase.</p></div>
      </section>
      <div className="profile-account-actions">
        <Button variant="secondary" fullWidth onClick={() => navigate("/actualizar-clave")}>Cambiar contraseña</Button>
        <Button variant="danger" fullWidth disabled={signingOut} onClick={() => void handleSignOut()}>{signingOut ? "Cerrando..." : "Cerrar sesión"}</Button>
      </div>
      <p className="version-label">NosVamos · versión 0.1.0</p>
    </>
  );
}
