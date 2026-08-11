const parts = (value: string, timeZone: string) => Object.fromEntries(
  new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
);

export const dateInTripZone = (value: string, timeZone: string) => {
  const valueParts = parts(value, timeZone);
  return `${valueParts.year}-${valueParts.month}-${valueParts.day}`;
};

export const timeInTripZone = (value: string, timeZone: string) => {
  const valueParts = parts(value, timeZone);
  return `${valueParts.hour}:${valueParts.minute}`;
};

export const dateTimeLocalInTripZone = (value: string, timeZone: string) => `${dateInTripZone(value, timeZone)}T${timeInTripZone(value, timeZone)}`;

export const formatTripDateTime = (value: string, timeZone: string, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat("es-AR", {
    timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", ...options,
  }).format(new Date(value));
