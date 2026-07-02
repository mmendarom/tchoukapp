# 007 - Supabase para licencias, con modo local cuando no hay backend configurado

- Estado: aceptada
- Fecha: 2026-07-01
- Contexto: spec `015-backend-cuentas-licencias`

## Contexto

La spec 015 necesita un backend minimo de cuentas y licencias sin pagos. Habia que elegir proveedor, definir el alta de licencias y decidir que pasa con la app cuando el backend no existe (desarrollo, usuarios actuales, torneos sin conexion).

## Decision

1. **Supabase como proveedor**: auth por email OTP + Postgres con RLS en la capa gratis. Un solo desarrollador lo opera desde el dashboard sin mantener servidores. El SQL queda versionado en `supabase/migrations/` para poder recrear el proyecto.
2. **Modo local si no hay configuracion**: el cliente se activa solo si existen `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Sin esas variables la app se comporta exactamente como antes (login local de la spec 014, sin red). Esto preserva offline-first, permite desarrollar sin backend y no rompe a los usuarios actuales.
3. **Alta manual con `pending`**: el trigger de registro crea la licencia en `pending` (sin acceso). Mauro activa por SQL. Nadie entra solo por registrarse: la lista de cortesia es una decision explicita.
4. **Gracia offline de 14 dias** desde la ultima verificacion online. Al vencer, la app bloquea en el arranque **salvo que haya un partido en vivo activo** (nunca se corta un partido iniciado).
5. **El cliente solo lee licencias**: sin policies de escritura para el rol anon/authenticated; toda administracion va por SQL editor o service role.
6. **Aislamiento de la dependencia**: `@supabase/supabase-js` vive solo en `src/backend/*`, consumido por pantallas y `App.tsx`. El dominio (`evaluateAccess`) y el store quedan puros y testeables sin red.

## Consecuencias

- Cuando Mauro cree el proyecto Supabase y pegue las dos variables, el login real queda operativo sin tocar codigo.
- La misma base sirve despues para pagos: activar una suscripcion sera actualizar `entitlements` desde un webhook (RevenueCat u otro), sin cambiar la app.
- Dependencia nueva de un servicio externo (Supabase) solo para licencias; los datos deportivos siguen locales.
- El reloj del dispositivo puede burlar la gracia offline; riesgo aceptado en esta etapa (grupo de cortesia conocido).
