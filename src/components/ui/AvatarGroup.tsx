import type { Participant } from "../../types/domain";

export function AvatarGroup({
  participants,
  limit = 4,
}: {
  participants: Participant[];
  limit?: number;
}) {
  const visible = participants.slice(0, limit);
  return (
    <div className="avatar-group" aria-label={`${participants.length} participantes`}>
      {visible.map((participant) => (
        <span
          className="avatar"
          key={participant.id}
          style={{ backgroundColor: participant.color }}
          title={participant.name}
        >
          {participant.initials}
        </span>
      ))}
      {participants.length > limit && (
        <span className="avatar avatar-more">+{participants.length - limit}</span>
      )}
    </div>
  );
}
