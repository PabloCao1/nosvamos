# Supabase de NosVamos

Proyecto de producción: `unfffijyvbtpkbkjorkt` (`sa-east-1`).

## Primera instalación

1. Abrir **Supabase → SQL Editor → New query**.
2. Copiar todo el contenido de `migrations/20260811010000_initial_schema.sql`.
3. Ejecutar con **Run** y comprobar que aparezca `Success. No rows returned`.
4. En **Table Editor** deben aparecer las tablas `profiles`, `trips`, `trip_members`, `destinations`, `reservations`, `expenses`, `notifications` y las restantes.

No ejecutar `private/real-data-backup.sql` hasta completar la migración específica del respaldo. Ese archivo contiene información real y está excluido de Git.

## Seguridad

- Todas las tablas expuestas tienen Row Level Security activa.
- Un usuario solo puede leer viajes donde sea integrante activo.
- `viewer` solo lee; `member`, `admin` y `owner` editan contenido.
- Solo `admin` y `owner` administran integrantes y eliminan contenido.
- Los documentos usan un bucket privado y paths con el formato `<trip_id>/<document_id>/<archivo>`.
