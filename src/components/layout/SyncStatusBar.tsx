import { usePendingSyncCount } from "../../hooks/usePendingSyncCount";
import { Icon } from "../ui/Icon";
import { Link } from "react-router-dom";

export function SyncStatusBar() {
  const { data: count = 0 } = usePendingSyncCount();
  if (count === 0) return null;
  return (
    <Link to="/sincronizacion" className="sync-status" role="status">
      <Icon name="cloudCheck" size={16} />
      {count} {count === 1 ? "cambio pendiente de sincronizar" : "cambios pendientes de sincronizar"}
    </Link>
  );
}
