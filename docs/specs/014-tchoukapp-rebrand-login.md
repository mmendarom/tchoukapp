# Spec 014 - Rebrand TCHOUKAPP, portada con login local y camino a monetizacion

- Estado: aprobada
- Fecha: 2026-07-01
- Relacionada con: `docs/plans/014-tchoukapp-rebrand-login-plan.md`, `docs/decisions/006-tchoukapp-rebrand-local-login-monetization.md`

## 1. Problema

La app se llama `Tchoukball Uruguay` y arranca directo en la pantalla de inicio, sin identidad propia ni nocion de usuario. El objetivo a mediano plazo es lanzarla al publico con una suscripcion mensual activable por usuario, manteniendo acceso gratuito para un grupo de companeros. Hoy no existe ninguna base para eso: no hay perfil de usuario, ni portada de bienvenida, ni marca propia, ni un lugar donde colgar el estado de acceso (cortesia vs suscripcion).

## 2. Objetivos

- Renombrar la app a `TCHOUKAPP` en toda la identidad visible: portada, inicio, splash, nombre de app instalada y documentacion.
- Consolidar el estilo visual celeste + azul + blanco en una paleta central reutilizable (`src/utils/theme.ts`) y aplicarla al shell de la app (navegacion, portada, inicio, splash).
- Agregar una portada de bienvenida con login local offline-first: el usuario crea su perfil (nombre y email opcional) una sola vez y entra directo en aperturas siguientes.
- Modelar el acceso por usuario con un campo `plan` (`cortesia` | `suscripcion`) que hoy siempre habilita acceso, pero deja el punto de extension listo para la suscripcion futura.
- Mantener compatibilidad total con datos y backups existentes.

## 3. No objetivos

- No agregar backend, autenticacion remota, cuentas en la nube ni verificacion de identidad. El login es local: identifica quien usa el dispositivo, no autentica contra un servidor.
- No integrar pagos, tiendas de suscripcion (RevenueCat, IAP) ni codigos de activacion en esta etapa. Solo se deja el modelo de dominio preparado.
- No migrar los 38 archivos con colores hardcodeados a tokens del theme en esta etapa; la migracion es incremental (ver plan).
- No cambiar `slug` de Expo ni identificadores nativos (`bundleIdentifier`, `package`): romperia el proyecto EAS y las builds instaladas. Ver decision 006.
- No tocar el flujo estable de partido (tiempos, timer, puntos, errores, cambios, undo, resumenes, `landingLocation`).

## 4. Flujo de usuario

### Primera apertura (sin perfil)

1. La app muestra la portada `TCHOUKAPP`: marca, tagline en espanol y formulario simple.
2. El usuario ingresa su nombre (obligatorio) y email (opcional).
3. Toca `Comenzar` y entra a `Inicio`. El perfil queda persistido localmente.

### Aperturas siguientes (con perfil)

1. La app hidrata el perfil desde AsyncStorage y entra directo a `Inicio`.
2. `Inicio` saluda al usuario por su nombre y muestra la marca `TCHOUKAPP`.

### Cerrar sesion

1. Desde `Inicio`, accion `Cerrar sesion` (zona utilitaria, no prominente).
2. Se borra solo el perfil de sesion. Los datos deportivos (jugadores, partidos, entrenamientos, backups) NO se tocan.
3. La app vuelve a la portada.

## 5. Reglas de dominio

- `UserProfile`: `id`, `name` (trim, 2..40 chars), `email` opcional (formato basico si se ingresa), `plan`, `createdAt`, `lastLoginAt`.
- `UserPlan = 'cortesia' | 'suscripcion'`. Todo perfil creado localmente nace con `cortesia`.
- `hasActiveAccess(profile)`: hoy devuelve `true` para `cortesia` y para `suscripcion`; es el unico punto que la futura logica de suscripcion debera endurecer.
- Validacion y construccion del perfil son funciones puras en `src/domain/session.ts`, con tests.

## 6. Estado y persistencia

- Nuevo store `useSessionStore` (Zustand + persist) con clave `tchoukstats:session-state` en AsyncStorage.
- Estado: `hasHydrated`, `profile?`, acciones `login(input)`, `logout()`, `setHasHydrated`.
- El gate de sesion vive en `App.tsx`: sin perfil -> portada; con perfil -> stack actual.
- El perfil NO entra al backup JSON (el backup es de datos deportivos y se comparte entre dispositivos/personas).

## 7. UI esperada

- Portada (`WelcomeScreen`): fondo navy (`#0b1f33`) con acentos celestes (`#8bd3ff`), marca `TCHOUKAPP` en blanco, tarjeta blanca con el formulario, boton azul (`#0b6bcb`). Sin dependencias nuevas (sin librerias de gradiente).
- Theme central `src/utils/theme.ts` con la paleta celeste + azul + blanco ya dominante en la app: navy `#0b1f33`, azul `#0b6bcb`, celeste `#8bd3ff`, celeste suave `#e8f6ff`, blanco `#ffffff`, fondos `#f4f7fb` / `#f7fafc`, bordes `#dbe4ef`, textos `#5d6b7a` / `#36546f`.
- `Inicio`: hero rebrandeado a `TCHOUKAPP`, saludo `Hola, {nombre}` y accion `Cerrar sesion` junto a `Reiniciar datos demo`. (Actualizado 2026-07-02: se elimino el kicker `Tchoukball Uruguay` y el logo de la asociacion; la marca visible es solo TCHOUKAPP con el logo propio `assets/logo.png`.)
- Splash y adaptive icon: fondo navy `#0b1f33` para que el arranque respete la identidad.
- Los colores semanticos existentes (verde de `en vivo`, tonos de training, rojo de peligro) se mantienen: comunican estado, no marca.

## 8. Monetizacion futura (documentada, no implementada)

Camino previsto cuando se decida lanzar al publico:

1. Backend minimo de licencias (o servicio tipo RevenueCat) con login real por email.
2. `plan: 'suscripcion'` validado contra el backend con periodo de gracia offline (la app debe seguir funcionando en torneos sin conexion).
3. Lista de cortesia administrada por Mauro: los companeros quedan con `plan: 'cortesia'` sin pago.
4. `hasActiveAccess` pasa a evaluar estado real de la suscripcion; es el unico punto de corte previsto.

Restriccion clave: la app es offline-first; cualquier chequeo de suscripcion futuro debe degradar con gracia sin conexion.

## 9. Pruebas

- `src/domain/session.test.ts`: validacion de nombre/email, construccion de perfil, `hasActiveAccess`.
- `src/store/useSessionStore.test.ts`: login feliz, login invalido, logout, persistencia parcial (partialize solo `profile`).
- `npx tsc --noEmit` y `npm test` en verde.
- QA manual: primera apertura muestra portada; login entra a Inicio; kill + reopen entra directo; cerrar sesion vuelve a portada sin perder partidos.

## 10. Limitaciones conocidas

- El login local no protege datos: cualquier persona con el dispositivo puede crear un perfil y entrar. Es identidad, no seguridad.
- El rename no alcanza `slug` ni identificadores nativos (decision 006); el nombre visible de la app instalada si cambia.
- La paleta se centraliza pero la mayoria de las pantallas internas siguen con colores hardcodeados (ya coherentes con la paleta); migracion incremental.
