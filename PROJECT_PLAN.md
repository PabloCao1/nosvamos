# NosVamos — plan de proyecto

## Objetivo

NosVamos será una PWA mobile-first para organizar viajes grupales. La primera audiencia es personal y familiar, pero los límites entre UI, dominio, persistencia y sincronización permiten evolucionarla a un producto multiusuario.

## Arquitectura propuesta

```text
Pantallas React
  ↓ usan
Componentes + hooks de consulta
  ↓ usan
Casos de uso / reglas de dominio
  ↓ dependen de interfaces
Repositorios (Mock / IndexedDB / Supabase)
  ↓
Cola offline y sincronización
```

- React y React Router: shell único, rutas lazy y navegación compatible con PWA.
- TanStack Query: ciclo de vida del estado remoto y caché; no reemplaza IndexedDB.
- Zustand: únicamente estado efímero global de UI.
- Repositorios: `TripRepository` desacopla las pantallas del origen de datos.
- Dexie: persistencia local y cola offline en fase 2.
- Supabase: Auth, PostgreSQL, Storage privado y Edge Functions donde haya secretos.
- `vite-plugin-pwa`: manifest, precache del app shell, caché de imágenes y actualización controlada.

## Estructura

```text
src/
  app/                   # router y providers
  components/
    layout/              # shell, tabs, FAB, banners
    ui/                  # componentes genéricos
    trips/
    itinerary/
    reservations/
    expenses/
  data/                  # fixtures demo
  features/              # casos de uso por dominio (fases siguientes)
  hooks/
  lib/
    expenses/            # reglas puras de negocio
    indexed-db/          # fase 2
    sync/                # fase 2
    supabase/            # fase 3
  pages/
  repositories/
  services/              # importación y proveedores
  stores/
  styles/
  types/
  utils/
```

## Decisiones técnicas

1. El modo demo es el origen por defecto. La aplicación arranca sin variables de entorno.
2. Los objetos sincronizables incluyen ID de servidor, `clientId`, versión, timestamps y estado de sincronización.
3. Las reservas son la fuente de verdad; el itinerario solo guarda una referencia cuando un bloque nace de una reserva.
4. Los importes originales nunca se sobrescriben. La conversión manual guarda importe, moneda, tasa e importe base.
5. Los adaptadores externos son opcionales. Carga manual, adjuntos y enlace web siempre funcionan.
6. Los secretos OAuth vivirán en backend; nunca en el bundle, IndexedDB ni tablas legibles por el cliente.
7. Los íconos Reicon están encapsulados en `Icon`, permitiendo cambiar de proveedor sin modificar pantallas.
8. Tailwind está disponible para composición futura; el sistema visual de fase 1 usa CSS semántico para mantener legibles los estados complejos.

## Fases verificables

### Fase 1 — base visual y PWA (entrega actual)

- Configuración React/TypeScript/Vite/Tailwind.
- Shell, cinco tabs, FAB contextual y bottom sheets.
- Inicio, viaje, itinerario, gastos, perfil y resumen de reservas.
- Repositorio mock, viaje completo y reglas de saldos.
- Manifest, app shell offline, instalación en iPhone y actualización preparada.
- Lint, typecheck, tests y build.

### Fase 2 — edición local offline

- Esquema Dexie y migraciones locales.
- Altas y edición de grupos, viajes, actividades, reservas y gastos.
- Formularios React Hook Form + Zod.
- Cola idempotente, reintentos y conflictos.
- Descarga selectiva de documentos.

### Fase 3 — Supabase

- Auth por email, perfiles, grupos e invitaciones.
- Migraciones SQL, triggers e índices.
- RLS probada por rol.
- Storage privado y URLs firmadas breves.
- Sincronización incremental y observabilidad.

### Fase 4 — centro de reservas completo

- Formularios específicos por tipo, segmentos, pagos y recordatorios internos.
- Adjuntos e importación manual de PDF/imagen/texto/URL como borrador.
- Enlaces profundos con fallback web.
- Vinculación con itinerario y gasto sin duplicar fuentes.

### Fase 5 — integraciones aprobadas

- Adaptadores de proveedor y OAuth mediante backend.
- APIs oficiales/partner únicamente.
- Nunca scraping ni credenciales del usuario.

## Riesgos

- iOS puede desalojar cachés y almacenamiento bajo presión: mostrar disponibilidad real y permitir volver a descargar.
- Background Sync no es uniforme en Safari: sincronizar también al abrir, enfocar y recuperar conexión.
- El usuario puede cerrar la PWA durante una carga: adjuntos por partes, estado persistido y reintentos.
- Fechas cruzan zonas horarias: almacenar `timestamptz` más zona IANA del viaje/reserva.
- Conflictos multiusuario: versión optimista y resolución visible; nunca “last write wins” silencioso ante cambios divergentes.
- Datos sensibles offline: minimizar, requerir selección explícita y no prometer cifrado fuerte mientras el runtime tenga acceso a la clave.
- Planes gratuitos tienen límites y pausas: mostrar fallos recuperables y mantener el modo local.

## Definición de terminado por fase

Cada fase debe pasar lint, typecheck, pruebas y build; incluir pruebas manuales en viewport iPhone, teclado, VoiceOver básico, modo standalone, reinicio offline y recuperación de conexión.
