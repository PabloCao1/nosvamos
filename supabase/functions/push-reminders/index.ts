import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const category = (type: string) => type === "flight" ? "flights" : ["hotel", "apartment"].includes(type) ? "lodging" : ["train", "bus", "ferry", "car"].includes(type) ? "transport" : "activities";
const shortHours = () => 1;

Deno.serve(async (request) => {
  if (request.headers.get("x-cron-secret") !== Deno.env.get("PUSH_CRON_SECRET")) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);
  const now = Date.now();
  const horizon = new Date(now + 49 * 60 * 60 * 1000).toISOString();
  const [{ data: reservations, error: reservationError }, { data: subscriptions, error: subscriptionError }] = await Promise.all([
    admin.from("reservations").select("id,trip_id,type,title,city,start_at,status").is("deleted_at", null).not("status", "in", '(cancelled,completed)').gt("start_at", new Date(now).toISOString()).lte("start_at", horizon),
    admin.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth_key,preferences"),
  ]);
  if (reservationError || subscriptionError) return Response.json({ error: reservationError?.message ?? subscriptionError?.message }, { status: 500 });
  const tripIds = [...new Set((reservations ?? []).map((item) => item.trip_id))];
  const [{ data: trips }, { data: members }, { data: deliveries }] = await Promise.all([
    tripIds.length ? admin.from("trips").select("id,owner_id").in("id", tripIds) : Promise.resolve({ data: [] }),
    tripIds.length ? admin.from("trip_members").select("trip_id,user_id").in("trip_id", tripIds).eq("status", "active") : Promise.resolve({ data: [] }),
    admin.from("push_deliveries").select("subscription_id,reservation_id,timing"),
  ]);
  const delivered = new Set((deliveries ?? []).map((item) => `${item.subscription_id}:${item.reservation_id}:${item.timing}`));
  let sent = 0;
  for (const subscription of subscriptions ?? []) {
    const userTrips = new Set([...(trips ?? []).filter((trip) => trip.owner_id === subscription.user_id).map((trip) => trip.id), ...(members ?? []).filter((member) => member.user_id === subscription.user_id).map((member) => member.trip_id)]);
    const prefs = subscription.preferences ?? {};
    for (const reservation of (reservations ?? []).filter((item) => userTrips.has(item.trip_id))) {
      const group = category(reservation.type);
      if (prefs[group] === false) continue;
      const timingPrefs = prefs.reminderTimings?.[group] ?? { twoDays: false, dayBefore: true, shortlyBefore: true };
      const timings = [["twoDays", 48], ["dayBefore", 24], ["shortlyBefore", shortHours()]] as const;
      for (const [timing, hours] of timings) {
        if (!timingPrefs[timing]) continue;
        const due = new Date(reservation.start_at).getTime() - hours * 60 * 60 * 1000;
        const key = `${subscription.id}:${reservation.id}:${timing}`;
        if (now < due || now >= due + 10 * 60 * 1000 || delivered.has(key)) continue;
        try {
          await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } }, JSON.stringify({
            title: timing === "twoDays" ? `En 2 días: ${reservation.title}` : timing === "dayBefore" ? `Mañana: ${reservation.title}` : `Próximo: ${reservation.title}`,
            body: `Empieza en ${hours} ${hours === 1 ? "hora" : "horas"}${reservation.city ? ` · ${reservation.city}` : ""}`,
            url: `/viaje/${reservation.trip_id}/reservas`, tag: `reminder-${reservation.id}-${timing}`,
          }));
          await admin.from("push_deliveries").insert({ subscription_id: subscription.id, reservation_id: reservation.id, timing });
          delivered.add(key); sent += 1;
        } catch (reason) { console.error("Push reminder failed", reason); }
      }
    }
  }
  const { data: pendingNotifications } = await admin.from("notifications")
    .select("id,user_id,kind,title,body,action_url").is("sent_at", null).lte("scheduled_for", new Date().toISOString()).limit(200);
  for (const notification of pendingNotifications ?? []) {
    const preferenceKey = notification.kind === "expense" ? "expenses" : notification.kind === "group_change" ? "groupChanges" : null;
    let notificationSent = false;
    for (const subscription of (subscriptions ?? []).filter((item) => item.user_id === notification.user_id)) {
      if (preferenceKey && subscription.preferences?.[preferenceKey] === false) continue;
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } }, JSON.stringify({
          title: notification.title, body: notification.body, url: notification.action_url || "/notificaciones", tag: `notification-${notification.id}`,
        }));
        notificationSent = true; sent += 1;
      } catch (reason) { console.error("Immediate push failed", reason); }
    }
    if (notificationSent) await admin.from("notifications").update({ sent_at: new Date().toISOString() }).eq("id", notification.id);
  }
  return Response.json({ ok: true, sent });
});
