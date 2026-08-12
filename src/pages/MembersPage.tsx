import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Icon } from "../components/ui/Icon";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useTrip } from "../hooks/useTrips";
import { ParticipantAvatar } from "../components/ui/AvatarGroup";

export function MembersPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);

  if (isLoading) return <LoadingState />;
  if (isError || !trip) return <ErrorState onRetry={() => void refetch()} />;

  const active = trip.participants.filter((person) => person.status !== "removed");
  const removed = trip.participants.filter((person) => person.status === "removed");

  return (
    <>
      <PageHeader eyebrow={trip.name} title="Integrantes" />
      <div className="member-list">
        {active.map((person) => (
          <article className="member-card" key={person.id}>
            <button className="member-summary" onClick={() => navigate(`/viaje/${trip.id}/integrantes/${person.id}`)}>
              <ParticipantAvatar participant={person} className="large-avatar member-avatar" />
              <div><h2>{person.name}</h2><p>{person.role === "owner" ? "Propietario" : "Integrante"}</p></div>
              <Icon name="chevronRight" size={18} />
            </button>
          </article>
        ))}
      </div>

      {removed.length > 0 && (
        <section className="section-block">
          <div className="section-heading"><div><h2>Integrantes retirados</h2></div><span>{removed.length}</span></div>
          <div className="removed-members">
            {removed.map((person) => (
              <button key={person.id} onClick={() => navigate(`/viaje/${trip.id}/integrantes/${person.id}`)}>
                <span>{person.name}</span><small>Ver historial</small>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
