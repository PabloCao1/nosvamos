import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, type AppNotification } from "../lib/indexed-db/database";
import { notificationRepository } from "./NotificationRepository";

const notification: AppNotification = {
  id: "test-notification",
  tripId: "test-trip",
  kind: "activity",
  title: "Aviso de prueba",
  body: "Contenido de prueba",
  createdAt: "2030-01-01T10:00:00Z",
  priority: "normal",
  targetPath: "/",
};

describe("NotificationRepository", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it("inicia sin notificaciones precargadas", async () => {
    expect(await notificationRepository.getAll()).toEqual([]);
  });

  it("persiste el estado leído", async () => {
    await db.notifications.add(notification);
    expect(await notificationRepository.getUnreadCount()).toBe(1);
    await notificationRepository.markRead(notification.id);
    expect(await notificationRepository.getUnreadCount()).toBe(0);
  });
});
