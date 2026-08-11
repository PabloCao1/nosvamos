# Modelo de datos

## Convenciones

- UUID en claves primarias y `client_id` para identidad offline.
- `timestamptz` para instantes; zona IANA separada.
- `numeric(14,2)` para dinero y código ISO 4217.
- `created_at`, `updated_at`, `deleted_at`, `version` en entidades sincronizables.
- Soft delete donde una eliminación deba propagarse.
- `jsonb` solo para metadata externa o campos específicos variables, nunca como sustituto del modelo relacional.

## Núcleo y membresía

| Tabla | Campos principales |
|---|---|
| `profiles` | `id → auth.users`, nombre, avatar, moneda, zona, idioma |
| `travel_groups` | owner, nombre, descripción |
| `travel_group_members` | group, user, rol, estado; unique(group,user) |
| `group_invitations` | group, email, rol, token hash, vencimiento, estado |
| `trips` | group, nombre, portada, fechas, moneda, zona, estado, presupuesto |
| `trip_members` | trip, user, rol; permite excepciones al grupo |
| `destinations` | trip, ciudad, país, fechas, dirección, coordenadas, imagen |

## Itinerario

| Tabla | Campos principales |
|---|---|
| `itinerary_days` | trip, destination, fecha, notas, posición |
| `activities` | day, reserva opcional, tiempos, ubicación, categoría, estado, costo, posición |
| `activity_participants` | activity, user |

La reserva es fuente de verdad. Una actividad generada por reserva guarda `reservation_id` y datos puramente de presentación/orden.

## Centro de reservas

`reservations` incluye trip, destination/day opcionales, tipo, proveedor, referencias externas, título, estado/pago, titular, tiempos/zona, ubicación, importes, cancelación, contacto, metadata cifrada o protegida, fuente/estado de importación, gasto opcional y disponibilidad offline.

Tablas relacionadas:

- `reservation_participants(reservation_id, profile_id)`;
- `reservation_documents(reservation_id, document_id, kind)`;
- `reservation_segments`: tramos ordenados con origen/destino, códigos, terminal/plataforma, tiempos y metadata específica;
- `reservation_reminders`: tipo, vencimiento y estado;
- `reservation_payments`: importe, moneda, fecha, medio y gasto asociado;
- `reservation_links`: etiqueta, URL web, deep link y proveedor;
- `reservation_imports`: fuente, archivo/texto de referencia, estado, borrador y errores;
- `travel_providers`: catálogo extensible;
- `provider_integrations`: configuración pública/estado por proveedor;
- `external_reservations`: mapa estable entre reserva y entidad externa;
- `provider_credentials`: solo accesible desde backend, tokens cifrados y metadatos de rotación.

## Finanzas

- `expenses`: importe/moneda original, tasa, importe base, pagador, categoría, fecha, reserva.
- `expense_participants`: personas incluidas.
- `expense_splits`: persona, monto/porcentaje/participaciones y monto calculado.
- `exchange_rates`: trip, monedas, tasa manual, fecha y autor.
- `budgets`: trip, total y moneda.
- `budget_categories`: budget, categoría e importe planificado.

Una reserva expresa el total comercial; los pagos reales se vinculan a gastos. No se suman ambos como gasto.

## Organización

`task_lists`, `tasks`, `documents`, `notes`, `polls`, `poll_options`, `poll_votes` y `sync_operations`.

Documentos almacenan únicamente path privado, nombre, MIME, tamaño, hash, propietario, clasificación y política offline. Nunca URL pública permanente.

## Índices

- todas las FKs;
- membresías por `(user_id, group_id)` y `(user_id, trip_id)`;
- entidades activas por `(trip_id, deleted_at)`;
- actividades por `(itinerary_day_id, position)`;
- reservas por `(trip_id, start_at)`, estado, pago, proveedor/referencia;
- gastos por `(trip_id, date)`;
- cola por `(user_id, status, next_attempt_at)`;
- índices parciales `where deleted_at is null`.

## Integridad y triggers

- checks de fechas, importes no negativos, monedas de tres letras y porcentajes.
- `updated_at` automático.
- versión incrementada en update.
- suma de splits validada al confirmar un gasto.
- `expense_id` y referencias externas protegidos contra ciclos/duplicados.
- invitaciones guardan hash del token, no token plano.

## RLS

Funciones `is_trip_member`, `trip_role` y `can_edit_trip` como `security definer` endurecidas y sin aceptar IDs de usuario aportados por cliente.

- SELECT: miembros activos del viaje/grupo.
- INSERT/UPDATE de contenido: owner/admin/member; viewer solo SELECT.
- membresías y permisos: owner/admin.
- DELETE lógico de reservas: owner/admin.
- perfiles: lectura limitada a grupos compartidos; cada usuario edita el propio.
- Storage privado: policies derivan el viaje desde metadata/tabla de documentos.
- `provider_credentials`: ninguna policy de cliente; Edge Functions con secretos backend.

Las pruebas de migración deben cubrir usuario ajeno, viewer, member, admin, owner, invitación vencida y soft delete.

## Orden de migraciones

1. extensiones, enums y funciones comunes;
2. perfiles/grupos/membresías;
3. viajes/destinos/itinerario;
4. reservas y relaciones;
5. gastos/presupuestos;
6. tareas/documentos/notas/votos;
7. sync e integraciones;
8. triggers, índices y RLS;
9. buckets privados y policies.
