import { useQuery } from "@tanstack/react-query";
import { fetchWeatherForecast } from "../lib/weather/weatherForecast";

export function useWeatherForecast(city?: string, country?: string) {
  return useQuery({
    queryKey: ["weather", city, country],
    queryFn: () => fetchWeatherForecast(city!, country),
    enabled: Boolean(city),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}
