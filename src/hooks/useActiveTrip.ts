import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { tripRepository } from "../repositories";

export function useActiveTrip(explicitTripId?: string) {
  const { tripId } = useParams();
  const contextualTripId = explicitTripId ?? tripId;
  return useQuery({
    queryKey: ["trips", contextualTripId ?? "active"],
    queryFn: () => contextualTripId ? tripRepository.getById(contextualTripId) : tripRepository.getActive(),
  });
}
