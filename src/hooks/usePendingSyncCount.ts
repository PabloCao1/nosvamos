import { useQuery } from "@tanstack/react-query";
import { tripRepository } from "../repositories";

export function usePendingSyncCount() {
  return useQuery({
    queryKey: ["sync", "pending-count"],
    queryFn: () => tripRepository.getPendingCount(),
    refetchOnWindowFocus: true,
  });
}
