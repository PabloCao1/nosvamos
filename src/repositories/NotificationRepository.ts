import { db, seedDemoData, seedDemoNotifications } from "../lib/indexed-db/database";
import { syncLocalReminders } from "../lib/push/localReminders";
import { tripRepository } from ".";

class LocalNotificationRepository {
  private async ready() {
    await seedDemoData();
    await seedDemoNotifications();
    await syncLocalReminders(await tripRepository.getAll());
  }

  async getAll() {
    await this.ready();
    return db.notifications.orderBy("createdAt").reverse().toArray();
  }

  async getUnreadCount() {
    await this.ready();
    return db.notifications.filter((notification) => !notification.readAt).count();
  }

  async markRead(id: string) {
    await this.ready();
    await db.notifications.update(id, { readAt: new Date().toISOString() });
  }

  async markAllRead() {
    await this.ready();
    await db.notifications.filter((notification) => !notification.readAt).modify({
      readAt: new Date().toISOString(),
    });
  }
}

export const notificationRepository = new LocalNotificationRepository();
