import type { Activity } from "../../types/domain";
import { Icon } from "../ui/Icon";
import { activityIcon } from "../../lib/icons/entityIcons";
import { EntitySyncStatus } from "../sync/EntitySyncStatus";

export function ActivityCard({ activity, onEdit }: { activity: Activity; onEdit?: () => void }) {
  return <div className="sync-entity-wrap">
    <button className="activity-card" onClick={onEdit} disabled={!onEdit} aria-label={onEdit ? `Editar ${activity.title}` : undefined}>
      <time>{activity.startTime}</time>
      <span className={`activity-icon category-${activity.category}`}>
        <Icon name={activityIcon[activity.category]} size={28} weight="Filled" />
      </span>
      <div>
        <h3>{activity.title}</h3>
        <p><Icon name="location" size={14} /> {activity.location}</p>
      </div>
      <Icon name="chevronRight" size={18} className="muted-icon" />
    </button>
    <EntitySyncStatus entity={activity} />
  </div>;
}
