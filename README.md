# NosVamos

PWA mobile-first para organizar viajes grupales, itinerarios, reservas y gastos. Funciona íntegramente en modo local y no necesita Supabase.

La aplicación inicia vacía. Las actividades, reservas y gastos creados o editados se conservan en IndexedDB al cerrar la aplicación y generan operaciones pendientes compactadas. Tocá una tarjeta para editarla o eliminarla. El indicador superior abre el centro de sincronización.

## Ejecutar

Requisitos: Node.js 22 o superior.

```bash
npm install
npm run dev
```

Abrí la URL que muestra Vite. Para probar desde un iPhone en la misma red se necesita servir por HTTPS; una publicación de preview en Cloudflare Pages ya lo proporciona.

## Verificaciones

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

El service worker se registra también en desarrollo para facilitar pruebas, aunque la validación offline definitiva debe hacerse sobre `build`/`preview` o un despliegue HTTPS.

## Instalación en iPhone

Abrí la URL en Safari, pulsá Compartir, elegí “Añadir a pantalla de inicio”, activá “Abrir como app web” y abrí NosVamos desde su ícono.

Las notificaciones requieren iOS/iPadOS 16.4 o posterior. Una vez instalada, abrí
`Perfil > Notificaciones push` y activá el interruptor. El permiso se solicita
únicamente después de ese toque, como exige iOS.

## Web Push

Configurá en `.env.local` la clave pública VAPID y la URL HTTPS del API:

```env
VITE_VAPID_PUBLIC_KEY=clave_publica_vapid
VITE_PUSH_API_URL=https://api.ejemplo.com/push
```

El API debe aceptar `POST /subscriptions` para guardar la suscripción y
`DELETE /subscriptions` para retirarla. Las claves privadas VAPID y el envío
quedan siempre del lado del servidor. El payload esperado por el service worker
es `{ "title", "body", "url", "tag", "notificationId" }`. Al tocar el aviso,
NosVamos abre la ruta indicada o `/notificaciones`.

## Configuración

Copiá `.env.example` a `.env.local` para configurar Web Push. Nunca agregues
claves privadas VAPID ni `service_role` al frontend.

## Deploy en Cloudflare Pages

- Comando de build: `npm run build`
- Directorio de salida: `dist`
- Versión de Node recomendada: 22

No se requiere función server-side en fase 1. Las rutas SPA usan el fallback generado por la PWA; para producción se agregará `_redirects` si el método de despliegue lo requiere.

## Documentación

- [Plan](./PROJECT_PLAN.md)
- [Esquema de datos](./DATABASE_SCHEMA.md)
- [Offline y sincronización](./OFFLINE_SYNC.md)
- [Sistema de diseño](./DESIGN_SYSTEM.md)
- [Alcance](./MVP_SCOPE.md)
