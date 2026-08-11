import { useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { useNotificationPreferences } from "../hooks/useNotificationPreferences";
import { usePushNotifications } from "../hooks/usePushNotifications";
import type { NotificationPreferences, ScheduledNotificationCategory } from "../lib/push/notificationPreferences";
import { sendTestPushNotification } from "../lib/push/pushNotifications";
import { useInstallStore } from "../stores/installStore";

const scheduledItems: [ScheduledNotificationCategory, string, string][] = [
  ["flights", "Vuelos", "Check-in y horario de salida"],
  ["transport", "Trenes y traslados", "Trenes, buses, ferries y autos"],
  ["lodging", "Alojamientos", "Ingreso a hoteles y departamentos"],
  ["activities", "Excursiones y actividades", "Reservas, restaurantes y eventos"],
];
const immediateItems: [keyof NotificationPreferences, string, string][] = [
  ["expenses", "Gastos", "Nuevos gastos y modificaciones"],
  ["groupChanges", "Cambios del grupo", "Contenido agregado o editado"],
];

export function NotificationSettingsPage() {
  const push = usePushNotifications();
  const preferences = useNotificationPreferences();
  const setInstallOpen = useInstallStore((state) => state.setInstallOpen);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testError, setTestError] = useState("");

  const testPush = async () => {
    setTesting(true); setTestMessage(""); setTestError("");
    try {
      const result = await sendTestPushNotification();
      if (result.registered < 1) setTestError("No encontramos un dispositivo registrado. Activá primero las notificaciones push.");
      else if (result.sent > 0) setTestMessage("Notificación enviada. Debería llegar en unos segundos.");
      else {
        const failure = result.failures[0];
        setTestError(`El dispositivo está registrado, pero el envío falló${failure?.statusCode ? ` (${failure.statusCode})` : ""}: ${failure?.message ?? "error desconocido"}`);
      }
    } catch (reason) {
      setTestError(reason instanceof Error ? reason.message : "No pudimos enviar la notificación de prueba.");
    } finally { setTesting(false); }
  };

  return <>
    <PageHeader eyebrow="Perfil" title="Notificaciones" />
    <section className="push-card">
      <span className="push-card-icon"><Icon name="bell" size={24} /></span>
      <div><strong>Notificaciones push</strong><p>{push.enabled ? "Recibirás avisos aunque NosVamos esté cerrada." : "Activá los avisos del viaje en este dispositivo."}</p>{push.error && <small role="alert">{push.error}</small>}</div>
      {push.availability === "ready" && <button type="button" className={push.enabled ? "push-toggle active" : "push-toggle"} aria-pressed={push.enabled} disabled={push.pending} onClick={push.enabled ? push.disable : push.enable}><span /></button>}
      {push.availability === "not-installed" && <Button size="small" variant="primary" onClick={() => setInstallOpen(true)}>Instalar</Button>}
    </section>
    {push.enabled && <section className="section-block push-test-card">
      <div><strong>Probá este dispositivo</strong><p>Te enviaremos un aviso para confirmar que el servicio está conectado.</p></div>
      <Button variant="secondary" fullWidth disabled={testing} onClick={() => void testPush()}>{testing ? "Enviando..." : "Enviar notificación de prueba"}</Button>
      {testMessage && <p className="form-success" role="status">{testMessage}</p>}
      {testError && <p className="form-error" role="alert">{testError}</p>}
    </section>}
    <section className="section-block notification-schedules">
      <div className="section-heading"><div><p className="eyebrow">Recordatorios</p><h2>Cuándo querés recibirlos</h2></div></div>
      {scheduledItems.map(([key, label, description]) => <article className="notification-schedule" key={key}>
        <label className="notification-preference"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={preferences.preferences[key]} onChange={(event) => preferences.update(key, event.target.checked)} /></label>
        {preferences.preferences[key] && <div className="timing-options">
          {([['twoDays', '2 días antes'], ['dayBefore', '1 día antes'], ['shortlyBefore', key === 'flights' || key === 'lodging' ? '3 horas antes' : key === 'transport' ? '2 horas antes' : '1 hora antes']] as const).map(([timing, timingLabel]) =>
            <label key={timing}><input type="checkbox" checked={preferences.preferences.reminderTimings[key][timing]} onChange={(event) => preferences.updateTiming(key, timing, event.target.checked)} /><span>{timingLabel}</span></label>)}
        </div>}
      </article>)}
    </section>
    <section className="section-block notification-preferences">
      <div className="section-heading"><div><p className="eyebrow">En el momento</p><h2>Actividad compartida</h2></div></div>
      {immediateItems.map(([key, label, description]) => <label className="notification-preference" key={key}><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={Boolean(preferences.preferences[key])} onChange={(event) => preferences.update(key, event.target.checked)} /></label>)}
    </section>
  </>;
}
