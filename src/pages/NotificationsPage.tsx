import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Icon, type IconName } from "../components/ui/Icon";
import { Button, DetailIndicator } from "../components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/PageState";
import { useNotifications } from "../hooks/useNotifications";
import type { AppNotification, NotificationKind } from "../lib/indexed-db/database";
import { notificationRepository } from "../repositories/NotificationRepository";

const kindIcons: Record<NotificationKind, IconName> = {
  expense: "wallet",
  lodging: "bed",
  transport: "airplane",
  activity: "calendar",
  document: "ticket",
  task: "check",
  payment: "receipt",
  alert: "bell",
};

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: () => void;
}) {
  const time = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(notification.createdAt));
  return (
    <button
      className={`notification-row notification-${notification.kind} ${notification.readAt ? "read" : "unread"}`}
      onClick={onOpen}
    >
      <span className="notification-kind"><Icon name={kindIcons[notification.kind]} size={21} /></span>
      <div>
        <h3>{notification.title}</h3>
        <p>{notification.body}</p>
        <time>{time}</time>
      </div>
      {!notification.readAt && <span className="unread-dot" aria-label="Sin leer" />}
      <DetailIndicator />
    </button>
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: notifications, isLoading, isError, refetch } = useNotifications();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
  const markAll = useMutation({
    mutationFn: () => notificationRepository.markAllRead(),
    onSuccess: refresh,
  });
  const markRead = useMutation({
    mutationFn: (id: string) => notificationRepository.markRead(id),
    onSuccess: refresh,
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const important = notifications?.filter((item) => item.priority === "important") ?? [];
  const groupActivity = notifications?.filter((item) => item.priority === "normal" && item.actorId) ?? [];
  const unread = notifications?.filter((item) => !item.readAt).length ?? 0;
  const open = (notification: AppNotification) => {
    if (!notification.readAt) markRead.mutate(notification.id);
    navigate(notification.targetPath);
  };

  return (
    <>
      <PageHeader
        title="Notificaciones"
        action={unread > 0 ? <Button variant="secondary" size="small" onClick={() => markAll.mutate()}>Marcar leídas</Button> : undefined}
      />
      {!notifications?.length ? (
        <EmptyState title="No hay novedades" message="La actividad de tu grupo y las alertas importantes aparecerán acá." />
      ) : (
        <>
          {important.length > 0 && (
            <section className="notification-section">
              <div className="section-heading"><div><p className="eyebrow">Requieren atención</p><h2>Alertas importantes</h2></div></div>
              <div className="notification-list">{important.map((item) => <NotificationRow key={item.id} notification={item} onOpen={() => open(item)} />)}</div>
            </section>
          )}
          <section className="notification-section">
            <div className="section-heading"><div><p className="eyebrow">Agregado por otros</p><h2>Actividad del grupo</h2></div></div>
            <div className="notification-list">{groupActivity.map((item) => <NotificationRow key={item.id} notification={item} onOpen={() => open(item)} />)}</div>
          </section>
        </>
      )}
    </>
  );
}
