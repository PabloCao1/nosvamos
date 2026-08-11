import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { Icon } from "../ui/Icon";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div className="offline-banner" role="status">
      <Icon name="wifiOff" size={17} />
      Sin conexión · los cambios se guardarán en este dispositivo
    </div>
  );
}
