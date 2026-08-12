const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T|\s)(\d{2}):(\d{2})/;

/**
 * Reservation values are wall-clock values: what the ticket or booking says.
 * Their visible date and time must never move with the device or trip timezone.
 */
const wallClockParts = (value: string) => {
  const match = value.match(DATE_TIME_PATTERN);
  if (!match) return null;
  return { date: `${match[1]}-${match[2]}-${match[3]}`, time: `${match[4]}:${match[5]}` };
};

export const dateInTripZone = (value: string, timeZone: string) => {
  void timeZone;
  return wallClockParts(value)?.date ?? value.slice(0, 10);
};

export const timeInTripZone = (value: string, timeZone: string) => {
  void timeZone;
  return wallClockParts(value)?.time ?? "00:00";
};

export const dateTimeLocalInTripZone = (value: string, timeZone: string) =>
  `${dateInTripZone(value, timeZone)}T${timeInTripZone(value, timeZone)}`;

export const localCalendarDate = (value = new Date()) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Converts a wall-clock value to an instant only for scheduling notifications. */
export const wallClockToInstant = (value: string, timeZone: string) => {
  if (!wallClockParts(value)) return new Date(value).getTime();
  const normalized = value.slice(0, 16);
  const desired = new Date(`${normalized}:00Z`).getTime();
  let instant = desired;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  for (let index = 0; index < 2; index += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    instant += desired - represented;
  }
  return instant;
};

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replace(".", "");

export const formatClockTime = (value: string) => {
  const [rawHour, rawMinute = "00"] = value.split(":");
  const hour = Number(rawHour);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour >= 12 ? "pm" : "am";
  const twelveHour = hour % 12 || 12;
  return `${String(twelveHour).padStart(2, "0")}:${rawMinute.slice(0, 2)} ${suffix}`;
};

export const formatShortDate = (value: string, timeZone?: string) => {
  void timeZone;
  const datePart = wallClockParts(value)?.date ?? value.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const values = Object.fromEntries(new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC", weekday: "short", day: "2-digit", month: "short", year: "numeric",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${titleCase(values.weekday)}, ${values.day} ${titleCase(values.month)} ${values.year}`;
};

export const formatTripDateTime = (value: string, timeZone: string, options: Intl.DateTimeFormatOptions = {}) => {
  void options;
  return `${formatShortDate(dateInTripZone(value, timeZone))}, ${formatClockTime(timeInTripZone(value, timeZone))}`;
};
