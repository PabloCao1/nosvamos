import { useWeatherForecast } from "../../hooks/useWeatherForecast";
import { weatherDescription, weatherSymbol } from "../../lib/weather/weatherForecast";

interface WeatherBannerProps {
  city: string;
  country?: string;
}

const dayFormatter = new Intl.DateTimeFormat("es-AR", { weekday: "short", timeZone: "UTC" });

export function WeatherBanner({ city, country }: WeatherBannerProps) {
  const { data, isLoading, isError } = useWeatherForecast(city, country);

  if (isLoading) return <section className="weather-banner weather-loading" aria-label="Cargando el clima"><span /><span /></section>;
  if (isError || !data) return null;

  return <section className="weather-banner" aria-label={`Clima en ${city}`}>
    <div className="weather-current">
      <div>
        <p className="weather-place">{city}</p>
        <strong>{Math.round(data.currentTemperature)}°</strong>
        <span>{weatherDescription(data.currentCode)}</span>
      </div>
      <span className="weather-current-symbol" role="img" aria-label={weatherDescription(data.currentCode)}>{weatherSymbol(data.currentCode)}</span>
    </div>
    <div className="weather-next-days">
      {data.days.slice(1, 4).map((day) => <div key={day.date}>
        <span>{dayFormatter.format(new Date(`${day.date}T12:00:00Z`)).replace(".", "")}</span>
        <b role="img" aria-label={weatherDescription(day.code)}>{weatherSymbol(day.code)}</b>
        <p><strong>{Math.round(day.temperatureMax)}°</strong> <small>{Math.round(day.temperatureMin)}°</small></p>
      </div>)}
    </div>
  </section>;
}
