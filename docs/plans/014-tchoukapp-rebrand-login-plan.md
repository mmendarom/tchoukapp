# Plan 014 - Rebrand TCHOUKAPP + portada con login local

Derivado de `docs/specs/014-tchoukapp-rebrand-login.md`.

## Stage 1 - Theme central

- Crear `src/utils/theme.ts` con la paleta celeste + azul + blanco (tokens documentados en la spec, seccion 7).
- Consumirlo desde `App.tsx` (header de navegacion, pantalla de carga), `Screen`, `WelcomeScreen` y `HomeScreen`.
- No migrar el resto de pantallas en esta etapa; los colores existentes ya son coherentes con la paleta.

## Stage 2 - Dominio y store de sesion

- `src/domain/session.ts`: tipos `UserPlan`, `UserProfile`, `SessionProfileInput`; funciones puras `validateProfileInput`, `buildUserProfile`, `hasActiveAccess`; `SESSION_STORE_DATA_VERSION`.
- `src/domain/session.test.ts`.
- `src/store/useSessionStore.ts`: Zustand + persist con clave nueva `tchoukstats:session-state` en `STORAGE_KEYS`; estado `hasHydrated`, `profile`; acciones `login`, `logout`; `partialize` solo `profile`.
- `src/store/useSessionStore.test.ts`.

## Stage 3 - Portada + gate

- `src/screens/WelcomeScreen.tsx`: portada TCHOUKAPP con formulario (nombre obligatorio, email opcional), mensajes de error en espanol, boton `Comenzar`.
- `App.tsx`: esperar hidratacion de match store + session store; sin perfil renderizar el stack solo con `Welcome`, con perfil el stack actual (patron de auth condicional de React Navigation).
- `RootStackParamList` suma `Welcome: undefined`.

## Stage 4 - Rebrand visible

- `HomeScreen`: hero `TCHOUKAPP` (kicker `Tchoukball Uruguay`), saludo con nombre del perfil, boton `Cerrar sesion` en la zona utilitaria.
- `app.json`: `name` -> `TchoukApp`, splash `backgroundColor` y `adaptiveIcon.backgroundColor` -> `#0b1f33`. Mantener `slug`, `bundleIdentifier` y `package` (decision 006).
- `package.json`: `name` -> `tchoukapp`.
- `src/domain/backup.ts`: `BACKUP_APP_NAME` -> `TchoukApp`, aceptando `Tchoukball Uruguay` como nombre legado sin advertencia. Actualizar tests de backup.

## Stage 5 - Documentacion y validacion

- Actualizar `docs/constitution.md`: nombre del producto, principio "sin autenticacion" reemplazado por "login local sin backend", boundaries de monetizacion.
- Registrar entrada en `docs/implementation-log.md` y decision `006`.
- `npx tsc --noEmit` + `npm test`.
- QA manual segun spec seccion 9.

## Riesgos

- El gate de sesion toca `App.tsx`, unico punto que envuelve todas las pantallas: verificar que la hidratacion doble (match + session) no deje la app clavada en "Cargando".
- El cambio de `BACKUP_APP_NAME` afecta la advertencia de importacion: cubrir con tests el nombre legado.
