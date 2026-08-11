import { PageHeader } from "../components/layout/PageHeader";
import { Icon, type IconName } from "../components/ui/Icon";
import { Button, IconButton } from "../components/ui/Button";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useNotificationPreferences } from "../hooks/useNotificationPreferences";
import type { NotificationPreferences } from "../lib/push/notificationPreferences";
import { useInstallStore } from "../stores/installStore";

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

  return (
    <>
      <PageHeader eyebrow="Cuenta personal" title="Perfil" />
      <section className="profile-card">
        <div className="large-avatar">NV</div>
        <div><h2>Tu perfil</h2><p>Iniciá sesión para sincronizar tus datos</p></div>
        <IconButton icon="edit" label="Editar perfil" size="small" />
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
              checked={notificationPreferences.preferences[key]}
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
        <div><strong>Tus datos son privados</strong><p>En la próxima fase, Supabase aplicará permisos por viaje y almacenamiento privado.</p></div>
      </section>
      <p className="version-label">NosVamos · versión 0.1.0</p>
    </>
  );
}
