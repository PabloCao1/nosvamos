import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization) return json({ error: "Falta autenticación" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "Sesión inválida" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const body = await request.json().catch(() => ({}));
  const action = body.action as string | undefined;

  if (action === "subscribe") {
    const subscription = body.subscription;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return json({ error: "Suscripción inválida" }, 400);
    }
    const { error } = await admin.from("push_subscriptions").upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
      device_id: body.deviceId ?? null,
      user_agent: body.userAgent ?? null,
      timezone: body.timezone ?? null,
      preferences: body.preferences ?? {},
      updated_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });
    return error ? json({ error: error.message }, 500) : json({ ok: true });
  }

  if (action === "preferences") {
    const { error } = await admin.from("push_subscriptions")
      .update({ preferences: body.preferences ?? {}, timezone: body.timezone ?? null, updated_at: new Date().toISOString() })
      .eq("user_id", user.id).eq("endpoint", body.endpoint).eq("device_id", body.deviceId);
    return error ? json({ error: error.message }, 500) : json({ ok: true });
  }

  if (action === "unsubscribe") {
    const { error } = await admin.from("push_subscriptions")
      .delete().eq("user_id", user.id).eq("endpoint", body.endpoint);
    return error ? json({ error: error.message }, 500) : json({ ok: true });
  }

  if (action === "test") {
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const subject = Deno.env.get("VAPID_SUBJECT");
    if (!publicKey || !privateKey || !subject) return json({ error: "Faltan secretos VAPID" }, 500);
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const { data: subscriptions, error } = await admin.from("push_subscriptions")
      .select("id,endpoint,p256dh,auth_key").eq("user_id", user.id);
    if (error) return json({ error: error.message }, 500);
    let sent = 0;
    const failures: { statusCode?: number; message: string }[] = [];
    for (const item of subscriptions ?? []) {
      try {
        await webpush.sendNotification({
          endpoint: item.endpoint,
          keys: { p256dh: item.p256dh, auth: item.auth_key },
        }, JSON.stringify({
          title: "NosVamos",
          body: "Las notificaciones push están funcionando correctamente.",
          url: "/notificaciones",
          tag: "push-test",
        }));
        sent += 1;
      } catch (reason) {
        const statusCode = (reason as { statusCode?: number }).statusCode;
        const message = reason instanceof Error ? reason.message : "Error desconocido de Web Push";
        failures.push({ statusCode, message });
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", item.id);
        } else {
          console.error("No se pudo enviar push", reason);
        }
      }
    }
    return json({ ok: failures.length === 0, registered: subscriptions?.length ?? 0, sent, failures });
  }

  return json({ error: "Acción desconocida" }, 400);
});
