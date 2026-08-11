import { useQuery } from "@tanstack/react-query";
import { findCityImage } from "../lib/images/cityImages";

export function useCityImage(city?: string, country?: string, enabled = true) {
  return useQuery({
    queryKey: ["city-image", city, country],
    queryFn: () => findCityImage(city!, country),
    enabled: enabled && Boolean(city),
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });
}
