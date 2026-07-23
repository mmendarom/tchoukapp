# Plan 021 - Licencias vigentes hasta 2027 y uso offline en torneo

Spec: `docs/specs/021-licencias-offline-torneo.md`

## Pasos

1. **Gracia offline** (`src/domain/session.ts`)
   - `ACCESS_GRACE_DAYS` 14 → 730, para que el límite efectivo sea `expiresAt`.

2. **Ingreso sin conexión** (`src/screens/WelcomeScreen.tsx`)
   - Estado `offlineMode`; `showLocalForm = !backendEnabled || offlineMode`.
   - Link "Entrar sin conexión" en el form online y "Entrar con email" en el local.
   - Copy del local adaptado cuando es modo offline.

3. **Pantalla de bloqueo** (`src/screens/AccessBlockedScreen.tsx`)
   - Copy de "expired" sin "14 días" fijo; sugiere entrar sin conexión.

4. **Backend** (`supabase/migrations/0004_autoactivate_and_extend_2027.sql`)
   - `update ... set expires_at = '2027-12-31T23:59:59Z'` (todas).
   - `update ... set status='active' where status='pending'`.
   - Trigger `handle_new_user` → inserta `status='active'`, `expires_at` fin 2027.
   - Actualizar `supabase/README.md` (paso 2).

5. **Tests** (`src/domain/session.test.ts`)
   - Derivar límites de gracia de `ACCESS_GRACE_DAYS` (helper `daysBefore`).

6. **Validación**: `npx tsc --noEmit`, `npm test`.

7. **Docs**: spec 021, este plan, decisión 010, `implementation-log.md`.

## Notas de operación

- Los cambios de cliente (1-3, 5) requieren rebuild EAS.
- El paso 4 (SQL) lo corre el admin en el SQL editor de Supabase; no afecta al
  iPad offline (que usa modo local), pero deja el resto de las cuentas vigentes.
