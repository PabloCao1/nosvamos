# Arquitectura offline y sincronización

## Objetivo

La app debe seguir siendo útil sin señal, sin presentar como sincronizado algo que solo existe localmente.

## Almacenamiento local (fase 2)

Dexie administrará:

- tablas de entidades descargadas (`trips`, `destinations`, `activities`, `reservations`, `expenses`, `tasks`);
- `sync_queue`;
- metadatos y cursores por viaje;
- referencias de documentos elegidos para offline.

No se descargarán todos los viajes ni todos los archivos. El usuario marca un viaje y documentos concretos como disponibles offline.

## Estados

`synced`, `pending_create`, `pending_update`, `pending_delete`, `conflict` y `failed`.

Cada entidad lleva `id`, `client_id`, `created_at`, `updated_at`, `deleted_at`, `version`, `sync_status` y `last_synced_at`.

## Cola

```text
id, operation_id, entity_type, local_id, action, payload,
attempts, last_error, created_at, next_attempt_at
```

`operation_id` es una clave idempotente estable. La implementación local compacta actualizaciones consecutivas: una creación seguida de ediciones permanece como una sola creación con el último payload; si esa creación se elimina antes de enviarse, desaparecen tanto la entidad como la operación. Los archivos usarán una cola limitada aparte.

## Flujo

1. La UI escribe primero en una transacción Dexie.
2. La misma transacción agrega/actualiza la operación pendiente.
3. TanStack Query recibe el valor optimista.
4. El procesador intenta sincronizar al abrir, enfocar, recuperar conexión y por acción manual.
5. El servidor aplica la operación si la versión base coincide.
6. La respuesta actualiza versión y marca `synced`.

Reintentos: backoff exponencial con jitter, tope y clasificación de errores. Errores de validación/permisos pasan a `failed`; problemas de red reintentan.

## Conflictos

- Si solo una versión cambió, se aplica el cambio.
- Campos no solapados pueden fusionarse.
- Cambios divergentes en el mismo campo pasan a `conflict`.
- La UI muestra copia local y remota; el usuario elige o combina.
- Nunca se sobrescribe silenciosamente un conflicto real.

## Service worker

El service worker precachea el app shell y usa Cache First limitado para imágenes. Los datos de usuario viven en IndexedDB, no en Cache Storage. La actualización se anuncia y se aplica con consentimiento para evitar perder formularios.

## Safari/iOS

- No depender exclusivamente de Background Sync.
- Tratar el almacenamiento como desalojable.
- Verificar `navigator.storage.estimate()` cuando esté disponible.
- Mantener tickets críticos pequeños y explícitamente descargados.
- Mostrar última sincronización y cantidad de operaciones pendientes.
- Evitar múltiples adjuntos grandes en paralelo.

## Seguridad local

IndexedDB no equivale a una bóveda. Se minimizan datos sensibles, se ocultan visualmente y solo se descargan por elección. Los secretos OAuth nunca se almacenan localmente. Al cerrar sesión se ofrece retirar datos offline del dispositivo.
