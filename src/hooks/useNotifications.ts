import { useQuery } from "@tanstack/react-query";
import { notificationRepository } from "../repositories/NotificationRepository";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationRepository.getAll(),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationRepository.getUnreadCount(),
  });
}
