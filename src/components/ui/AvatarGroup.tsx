import type { Participant } from "../../types/domain";
import { useAvatarUrl } from "../../hooks/useAvatarUrl";

export function ParticipantAvatar({ participant, className = "avatar" }: { participant: Participant; className?: string }) {
  const avatarUrl = useAvatarUrl(participant.avatarPath);
  return <span className={className} style={{ backgroundColor: participant.color }} title={participant.name}>
    {avatarUrl ? <img src={avatarUrl} alt={participant.name} /> : participant.initials}
  </span>;
}

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
      {visible.map((participant) => <ParticipantAvatar participant={participant} key={participant.id} />)}
      {participants.length > limit && (
        <span className="avatar avatar-more">+{participants.length - limit}</span>
      )}
    </div>
  );
}
