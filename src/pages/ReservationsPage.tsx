import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { ReservationCard } from "../components/reservations/ReservationCard";
import { Icon } from "../components/ui/Icon";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useTrip } from "../hooks/useTrips";

export function ReservationsPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const reservations = useMemo(() => {
    if (!trip) return [];
    return trip.reservations.filter((reservation) => {
      const text = `${reservation.title} ${reservation.providerName} ${reservation.providerReference} ${reservation.city}`.toLowerCase();
      return text.includes(search.toLowerCase()) && (filter === "all" || reservation.type === filter);
    });
  }, [filter, search, trip]);

  if (isLoading) return <LoadingState />;
  if (isError || !trip) return <ErrorState onRetry={() => void refetch()} />;
  return (
    <>
      <PageHeader eyebrow={trip.name} title="Reservas" />
      <label className="search-field">
        <Icon name="search" size={19} />
        <span className="sr-only">Buscar reservas</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, proveedor o ciudad" />
      </label>
      <div className="filter-row" aria-label="Filtrar reservas">
        {[["all", "Todas"], ["flight", "Vuelos"], ["hotel", "Alojamiento"], ["train", "Trenes"], ["restaurant", "Comidas"]].map(([value, label]) => (
          <button className={filter === value ? "active" : ""} onClick={() => setFilter(value)} key={value}>{label}</button>
        ))}
      </div>
      <section className="reservation-alert">
        <Icon name="bell" size={21} />
        <div><strong>2 acciones próximas</strong><p>Un check-in y un pago pendiente</p></div>
        <Icon name="chevronRight" size={18} />
      </section>
      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">Vista cronológica</p><h2>Próximas reservas</h2></div><span>{reservations.length}</span></div>
        <div className="card-stack">
          {reservations.map((item) => <ReservationCard key={item.id} reservation={item} timezone={trip.timezone} onEdit={() => navigate(`/viaje/${trip.id}/editar/reservation/${item.id}`)} />)}
          {reservations.length === 0 && <p className="no-results">No encontramos reservas con esos filtros.</p>}
        </div>
      </section>
    </>
  );
}
