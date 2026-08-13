import { searchCities } from "../locations/searchCities";

export interface WeatherDay {
  date: string;
  code: number;
  temperatureMax: number;
  temperatureMin: number;
}

export interface WeatherForecast {
  currentTemperature: number;
  currentCode: number;
  days: WeatherDay[];
}

interface OpenMeteoForecast {
  current: { temperature_2m: number; weather_code: number };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export async function fetchWeatherForecast(city: string, country?: string): Promise<WeatherForecast> {
  const places = await searchCities(`${city}${country ? `, ${country}` : ""}`);
  const place = places[0];
  if (!place) throw new Error("No se pudo ubicar el destino");

  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    temperature_unit: "celsius",
    timezone: "auto",
    forecast_days: "4",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error("No se pudo obtener el pronóstico");
  const payload = await response.json() as OpenMeteoForecast;

  return {
    currentTemperature: payload.current.temperature_2m,
    currentCode: payload.current.weather_code,
    days: payload.daily.time.map((date, index) => ({
      date,
      code: payload.daily.weather_code[index],
      temperatureMax: payload.daily.temperature_2m_max[index],
      temperatureMin: payload.daily.temperature_2m_min[index],
    })),
  };
}

export function weatherDescription(code: number) {
  if (code === 0) return "Despejado";
  if (code <= 2) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if (code <= 48) return "Con niebla";
  if (code <= 57) return "Llovizna";
  if (code <= 67) return "Lluvia";
  if (code <= 77) return "Nieve";
  if (code <= 82) return "Chaparrones";
  if (code <= 86) return "Nieve intensa";
  return "Tormentas";
}

export function weatherSymbol(code: number) {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  if (code <= 86) return "❄️";
  return "⛈️";
}
