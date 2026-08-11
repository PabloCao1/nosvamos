interface Env { ASSETS: { fetch(request: Request): Promise<Response> }; PUSH_CRON_SECRET: string }

export default {
  fetch(request: Request, env: Env) { return env.ASSETS.fetch(request); },
  scheduled(_controller: unknown, env: Env, context: { waitUntil(promise: Promise<unknown>): void }) {
    context.waitUntil(fetch("https://unfffijyvbtpkbkjorkt.supabase.co/functions/v1/push-reminders", {
      method: "POST",
      headers: { "x-cron-secret": env.PUSH_CRON_SECRET },
    }));
  },
};
