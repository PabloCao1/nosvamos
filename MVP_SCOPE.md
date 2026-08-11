# Alcance del MVP

## Incluido en fase 1

- Diseño mobile-first con Graphite y Sky Mint.
- Navegación Inicio, Itinerario, Gastos, Viaje y Perfil.
- FAB cuyas acciones cambian según la ruta.
- Viaje demo con cuatro destinos, cuatro participantes y varios días.
- Reservas demo de vuelo, hotel, tren y restaurante.
- Gastos, saldos netos y transferencias mínimas.
- Estados de carga, error, vacío y ausencia de resultados.
- Pantalla de reservas con búsqueda, filtros y orden cronológico.
- Manifest, service worker, caché del app shell y ayuda de instalación.
- Interfaces de repositorio y tipos preparados para Supabase.

## Extensión offline implementada

- Base Dexie versionada y seed idempotente.
- Tablas locales para viajes, actividades, reservas, gastos y `sync_queue`.
- Formularios Zod + React Hook Form para crear actividades, reservas y gastos.
- Escritura atómica de entidad y operación idempotente.
- Indicador visible de cambios pendientes.
- Actualización inmediata de consultas y persistencia entre aperturas.
- Edición y eliminación offline de actividades, reservas y gastos.
- Soft-delete para registros sincronizados y cancelación limpia de altas locales.
- Compactación de múltiples ediciones sobre una sola operación.
- Centro de sincronización con inspección, reintento y descarte de fallos.

## Próximo MVP funcional

- Registro/login demo y luego Supabase Auth.
- CRUD de grupo, viaje, participantes, destinos, actividades, reservas y gastos.
- Resolución visible de conflictos provenientes del backend.
- Cola de sincronización visible.
- Adjuntos locales seleccionados.
- Validación Zod y formularios adaptativos.

## Fuera de alcance inicial

- Push, clima real, mapas embebidos y cambio automático.
- Compra o login dentro de proveedores.
- OCR, IA, scraping o lectura automática de emails.
- Estado de vuelos en tiempo real.
- Chat y colaboración en tiempo real.
- APIs comerciales sin credenciales aprobadas.

## Criterios de aceptación

- `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` finalizan correctamente.
- Todas las tabs y rutas auxiliares son navegables.
- El safe area inferior no queda tapado por la tab bar.
- La PWA abre tras una primera carga sin conexión.
- Los datos mock cubren itinerario, reservas, gastos y saldos.
- Componentes y páginas no importan fixtures directamente; consultan un repositorio.
- La instalación en iPhone se explica y se oculta en standalone.
