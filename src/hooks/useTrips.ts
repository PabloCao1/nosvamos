import { useQuery } from "@tanstack/react-query";
import { tripRepository } from "../repositories";

export function useTrips() {
  return useQuery({
    queryKey: ["trips"],
    queryFn: () => tripRepository.getAll(),
  });
}

export function useTrip(id?: string) {
  return useQuery({
    queryKey: ["trips", id ?? "active"],
    queryFn: () => id ? tripRepository.getById(id) : tripRepository.getActive(),
  });
}
