import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Trip } from "../../types/domain";
import type { IconName } from "../ui/Icon";
import { Icon } from "../ui/Icon";
import { DetailIndicator } from "../ui/Button";
import { dateInTripZone, formatClockTime, timeInTripZone } from "../../lib/dates/tripDateTime";

interface CalendarEvent {
  id: string;
  entityId: string;
  kind: "reservation" | "activity";
  moment?: "start" | "end";
  date: string;
  time: string;
  title: string;
  detail: string;
  icon: IconName;
  tone: "mint" | "violet" | "amber" | "blue";
}

const transportTypes = new Set(["flight", "train", "bus", "ferry", "car"]);
const lodgingTypes = new Set(["hotel", "apartment"]);

export function TripCalendar({ trip }: { trip: Trip }) {
  const events = useMemo(() => {
    const items: CalendarEvent[] = [];
    for (const reservation of trip.reservations.filter((item) => item.status !== "cancelled")) {
      const isTransport = transportTypes.has(reservation.type);
      const isLodging = lodgingTypes.has(reservation.type);
      items.push({
        id: `${reservation.id}-start`,
        entityId: reservation.id,
        kind: "reservation",
        moment: "start",
        date: dateInTripZone(reservation.startAt, trip.timezone),
        time: timeInTripZone(reservation.startAt, trip.timezone),
        title: isLodging ? `Check-in · ${reservation.title}` : reservation.title,
        detail: isTransport
          ? `${reservation.originCity ?? reservation.originPlace ?? "Origen"} → ${reservation.destinationCity ?? reservation.destinationPlace ?? reservation.city}`
          : reservation.address ?? reservation.city,
        icon: reservation.type === "flight" ? "airplane" : reservation.type === "train" ? "train" : isLodging ? "bed" : "ticket",
        tone: reservation.type === "flight" ? "violet" : isLodging ? "blue" : "mint",
      });
      if (reservation.endAt) {
        items.push({
          id: `${reservation.id}-end`,
          entityId: reservation.id,
          kind: "reservation",
          moment: "end",
          date: dateInTripZone(reservation.endAt, trip.timezone),
          time: timeInTripZone(reservation.endAt, trip.timezone),
          title: isLodging ? `Check-out · ${reservation.title}` : isTransport ? `Llegada · ${reservation.title}` : `Finaliza · ${reservation.title}`,
          detail: isTransport ? reservation.destinationPlace ?? reservation.destinationCity ?? reservation.city : reservation.city,
          icon: reservation.type === "flight" ? "airplane" : reservation.type === "train" ? "train" : isLodging ? "bed" : "ticket",
          tone: reservation.type === "flight" ? "violet" : isLodging ? "blue" : "mint",
        });
      }
    }
    for (const day of trip.itinerary) {
      for (const activity of day.activities) {
        items.push({
          id: activity.id,
          entityId: activity.id,
          kind: "activity",
          date: day.date,
          time: activity.startTime,
          title: activity.title,
          detail: activity.location,
          icon: activity.category === "food" ? "receipt" : activity.category === "transport" ? "airplane" : "calendar",
          tone: "amber",
        });
      }
    }
    return items.sort((first, second) => `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`));
  }, [trip]);

  const dates = [...new Set(events.map((event) => event.date))];
  const today = new Date().toISOString().slice(0, 10);
  const initialDate = dates.find((date) => date >= today) ?? dates.at(-1) ?? trip.startDate;
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const selectedEvents = events.filter((event) => event.date === selectedDate);
  const selectedLabel = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${selectedDate}T12:00:00`));

  if (!events.length) return null;

  return (
    <section className="trip-calendar">
      <div className="section-heading calendar-heading">
        <div><h2>Calendario</h2></div>
      </div>
      <div className="calendar-date-strip" role="tablist" aria-label="Fechas con eventos">
        {dates.map((date) => {
          const value = new Date(`${date}T12:00:00`);
          const active = date === selectedDate;
          return (
            <button key={date} role="tab" aria-selected={active} className={active ? "active" : ""} onClick={() => setSelectedDate(date)}>
              <small>{new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(value)}</small>
              <strong>{value.getDate()}</strong>
              <span>{new Intl.DateTimeFormat("es-AR", { month: "short" }).format(value)}</span>
              <i>{events.filter((event) => event.date === date).length}</i>
            </button>
          );
        })}
      </div>
      <p className="calendar-selected-date">{selectedLabel}</p>
      <div className="calendar-event-list">
        {selectedEvents.map((event) => (
          <Link
            className="calendar-event"
            key={event.id}
            to={`/viaje/${trip.id}/evento/${event.kind}/${event.entityId}${event.moment ? `?momento=${event.moment}` : ""}`}
            aria-label={`Ver detalle de ${event.title}`}
          >
            <span className={`calendar-event-icon ${event.tone}`}><Icon name={event.icon} size={26} weight="Filled" /></span>
            <time className="calendar-event-time">{formatClockTime(event.time)}</time>
            <div>
              <h3>{event.title}</h3>
              <p>{event.detail}</p>
            </div>
            <div className="calendar-event-side"><DetailIndicator /></div>
          </Link>
        ))}
      </div>
    </section>
  );
}
