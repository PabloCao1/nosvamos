import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../components/layout/PageHeader";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/Button";
import { EmptyState, LoadingState } from "../components/ui/PageState";
import { tripRepository } from "../repositories";

const entityLabels = { trip: "Viaje", activity: "Actividad", expense: "Gasto", reservation: "Reserva" };
const actionLabels = { create: "Crear", update: "Actualizar", delete: "Eliminar" };

export function SyncQueuePage() {
  const queryClient = useQueryClient();
  const { data: operations, isLoading } = useQuery({
    queryKey: ["sync", "queue"],
    queryFn: () => tripRepository.getSyncQueue(),
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["sync"] }),
      queryClient.invalidateQueries({ queryKey: ["trips"] }),
    ]);
  };
  const retry = useMutation({ mutationFn: (id: string) => tripRepository.retryQueueItem(id), onSuccess: refresh });
  const discard = useMutation({ mutationFn: (id: string) => tripRepository.discardQueueItem(id), onSuccess: refresh });

  if (isLoading) return <LoadingState />;
  return (
    <>
      <PageHeader eyebrow="Modo offline" title="Sincronización" />
      <section className="sync-explainer">
        <Icon name="cloudCheck" size={24} />
        <div><strong>Tus cambios están seguros</strong><p>Se enviarán a Supabase cuando el backend esté conectado. Las operaciones repetidas ya están compactadas.</p></div>
      </section>
      {!operations?.length ? (
        <EmptyState title="Todo sincronizado" message="No hay cambios pendientes en este dispositivo." />
      ) : (
        <section className="queue-list">
          {operations.map((operation) => (
            <article key={operation.id}>
              <span className={`queue-icon queue-${operation.status}`}>
                <Icon name={operation.entityType === "trip" ? "suitcase" : operation.entityType === "expense" ? "wallet" : operation.entityType === "reservation" ? "ticket" : "calendar"} size={20} />
              </span>
              <div>
                <strong>{actionLabels[operation.action]} {entityLabels[operation.entityType].toLowerCase()}</strong>
                <p>{operation.lastError ? `Pendiente de sincronizar: ${operation.lastError}` : "Pendiente de sincronizar"} · {new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(operation.createdAt))}</p>
              </div>
              {operation.lastError && (
                <div className="queue-actions">
                  <Button variant="secondary" size="small" onClick={() => retry.mutate(operation.id)}>Reintentar</Button>
                  <Button variant="danger" size="small" onClick={() => discard.mutate(operation.id)}>Descartar</Button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </>
  );
}
