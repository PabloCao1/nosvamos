const parts = (value: string, timeZone: string) => Object.fromEntries(
  new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
);

export const dateInTripZone = (value: string, timeZone: string) => {
  if (!value.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(value)) return value.slice(0, 10);
  const valueParts = parts(value, timeZone);
  return `${valueParts.year}-${valueParts.month}-${valueParts.day}`;
};

export const timeInTripZone = (value: string, timeZone: string) => {
  if (!value.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(value)) return value.slice(11, 16) || "00:00";
  const valueParts = parts(value, timeZone);
  return `${valueParts.hour}:${valueParts.minute}`;
};

export const dateTimeLocalInTripZone = (value: string, timeZone: string) => `${dateInTripZone(value, timeZone)}T${timeInTripZone(value, timeZone)}`;

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
  const zoned = Boolean(timeZone && (value.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(value)));
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  const values = Object.fromEntries(new Intl.DateTimeFormat("es-AR", {
    ...(zoned ? { timeZone } : {}), weekday: "short", day: "2-digit", month: "short", year: "numeric",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${titleCase(values.weekday)}, ${values.day} ${titleCase(values.month)} ${values.year}`;
};

export const formatTripDateTime = (value: string, timeZone: string, options: Intl.DateTimeFormatOptions = {}) => {
  void options;
  const localDate = dateInTripZone(value, timeZone);
  const localTime = timeInTripZone(value, timeZone);
  return `${formatShortDate(localDate)}, ${formatClockTime(localTime)}`;
};
