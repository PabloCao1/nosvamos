import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SyncableEntity } from "../../types/domain";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { tripRepository } from "../../repositories";
import { Button } from "../ui/Button";

export function EntitySyncStatus({ entity }: { entity: SyncableEntity }) {
  const online = useOnlineStatus();
  const queryClient = useQueryClient();
  const { data: queue = [] } = useQuery({ queryKey: ["sync", "queue"], queryFn: () => tripRepository.getSyncQueue(), refetchInterval: 3000 });
  const operation = queue.find((item) => item.localId === entity.id);
  const retry = useMutation({
    mutationFn: async () => {
      if (!operation) return;
      await tripRepository.retryQueueItem(operation.id);
      await tripRepository.getPendingCount();
    },
    onSuccess: async () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["sync"] }),
      queryClient.invalidateQueries({ queryKey: ["trips"] }),
    ]),
  });

  if (!operation) return null;
  if (online && !operation.lastError) return <div className="entity-sync syncing"><span className="sync-spinner" /> Sincronizando…</div>;
  return <div className="entity-sync pending">
    <p>{online ? "No se pudo confirmar la carga en el servidor." : "Sin internet. Quedó guardado y se enviará cuando vuelva la conexión."}</p>
    <Button size="small" variant="secondary" disabled={retry.isPending} onClick={() => retry.mutate()}>{retry.isPending ? "Actualizando…" : "Volver a actualizar"}</Button>
  </div>;
}
