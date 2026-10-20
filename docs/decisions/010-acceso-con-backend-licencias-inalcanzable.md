# Decision: Acceso cuando el backend de licencias es inalcanzable

## Date

2026-10-19

## Status

Accepted

## Context

El 2026-10-18 un compañero pidió que le activaran la licencia. Mauro abrió Perfil desde el teléfono y la lista de Administración nunca se actualizó. La causa real: **el proyecto de Supabase estaba pausado** (capa gratuita: los proyectos se pausan tras ~7 días de inactividad) y hubo que reanudarlo a mano desde el dashboard.

El incidente expuso un problema estructural, no un bug de UI. La app es offline-first y su único uso de red es verificar licencias (spec 015), así que una semana sin que nadie la abra —normal entre torneos— alcanza para que el proyecto se pause. Es un fallo **cíclico**, no un evento raro.

Lo que pasa hoy cuando el backend no responde:

1. `App.tsx` refresca la licencia al arrancar y **descarta cualquier error en silencio**, sin registrar nada.
2. Pasados los 14 días de gracia (`ACCESS_GRACE_DAYS`), `evaluateAccess` devuelve `'expired'` y `AccessBlockedScreen` bloquea la app.
3. El copy de `'expired'` dice *"Conectate a internet y reintentá"* y el botón de reintento falla con *"Revisá tu conexión"*. Ambos mensajes son falsos: el usuario tiene internet, el servidor está dormido. Lo mandan a buscar el problema en su wifi.
4. `WelcomeScreen.tsx:352` **no renderiza el formulario de modo local cuando el backend está configurado**. Entonces "Cerrar sesión" desde la pantalla de bloqueo no es una salida: lleva a la portada, el OTP falla porque el proyecto está pausado, y el usuario queda afuera de una app offline-first con todos sus datos intactos en el teléfono y ningún camino de vuelta.

O sea: una pausa de más de 14 días deja a todo el cuerpo técnico sin app, con un mensaje de error que miente, en el peor momento posible (el primer día de un torneo es justo cuando nadie la abrió en semanas).

Al mismo tiempo, el objetivo de la decisión 007 sigue vigente y fue reafirmado explícitamente por Mauro: **evitar que gente no deseada use la app sin permiso**. Todo usuario debe autenticarse y tener una licencia activa.

## Decision

### 1. Fail-open acotado, anclado en el primer fallo (no en la última verificación)

Cuando la verificación falla porque **el servidor es inalcanzable**, los días de inalcanzabilidad **no consumen gracia**, pero hay un techo: `UNREACHABLE_CEILING_DAYS = 21` contados desde el primer fallo observado.

Se agrega `unreachableSince` a `AccountEntitlement`: se setea en el primer intento fallido por red/servidor y **se limpia en cualquier verificación exitosa**. Los intentos fallidos posteriores **no** lo pisan (si no, el techo nunca vencería).

El ancla es deliberadamente `unreachableSince` y **no** `verifiedAt`. Anclar en `verifiedAt` falla justo en el escenario que importa: si nadie abrió la app en tres meses, la gracia venció hace mucho y cualquier techo medido desde `verifiedAt` bloquea de inmediato el primer día del torneo. Medido desde el primer fallo, en cambio, la app concede 21 días más a partir del momento en que detecta el problema — tiempo de sobra para que Mauro reanude el proyecto.

### 2. El fail-open aplica SOLO a una licencia cacheada como `active`

Esto es la propiedad de seguridad central de esta decisión:

- `status === 'active'` + servidor inalcanzable → se concede acceso dentro del techo.
- `status === 'pending'` → **sigue bloqueando**, inalcanzable o no. Alguien que nunca fue aprobado no entra nunca, ni aprovechando que el servidor está caído.
- `status === 'revoked'` → **sigue bloqueando**. La revocación cacheada es autoritativa.
- `expiresAt` cumplido (`'lapsed'`) → **sigue bloqueando**. Es un dato local autoritativo.

Así, el fail-open no abre ninguna puerta nueva: solo extiende acceso a quien **ya fue aprobado y verificado**, por una ventana acotada.

### 3. Sesión muerta ≠ servidor inalcanzable

Son fallos distintos y se resuelven distinto:

- **Inalcanzable** (red, DNS, timeout, proyecto pausado, 5xx): no es culpa del usuario y no lo puede arreglar → fail-open acotado.
- **Sesión inválida** (sin sesión guardada, refresh token rechazado, JWT inválido): el servidor **respondió**, así que está vivo, y el arreglo está en manos del usuario → **no** extiende el techo; se le pide reloguear con un mensaje claro.

Esto exige tipar el motivo del fallo en `src/backend` en vez de pasar solo strings de error.

### 4. Sin salida a modo local con backend configurado

Se descarta ofrecer "entrar sin cuenta" en la portada cuando el backend está configurado. Mauro lo pidió explícitamente: autenticación y licencia son obligatorias. Consecuencia aceptada: el único camino de recuperación es el fail-open acotado, lo que convierte al keep-alive del proyecto (punto 5) en **load-bearing**, no en un extra.

### 5. Mantener el proyecto despierto es parte del contrato

Se agrega un cron de GitHub Actions que pinguea el proyecto dos veces por semana. No es una optimización: con el punto 4, es lo que evita el brick. Falla ruidosamente si el proyecto no responde, así que además funciona como monitoreo gratuito.

Se descarta pasar a Supabase Pro (quita el auto-pausado): es un servicio pago y la constitution lo prohíbe antes de una decisión explícita de lanzamiento.

## Alternativas consideradas

### La rama `feature/scouting-rosters-torneo` (descartada el 2026-10-20)

Al implementar P1 apareció una rama remota sin mergear, del 2026-07-23, que había resuelto este mismo problema por otro camino, con su propia decisión (`010-licencias-offline-y-auto-activacion.md`, mismo número que esta) y su spec `021-licencias-offline-torneo`:

1. Agregar modo local ("Entrar sin conexión") en la portada aun con backend configurado.
2. Extender `ACCESS_GRACE_DAYS` de 14 a **730 días**, dejando `expiresAt` como único corte real.
3. Migración `0004_autoactivate_and_extend_2027.sql`: pasar todas las `pending` a `active`, vencimiento 2027-12-31, y trigger de alta que crea las licencias nuevas ya `active` (**auto-activación**).

**Descartada por Mauro el 2026-10-20.** El motivo central: la auto-activación contradice directamente el objetivo reafirmado en esta decisión de evitar que gente no deseada use la app sin permiso — la propia decisión de esa rama admitía que "afloja la postura de activación manual de la decisión 007, a propósito". Los puntos 1 y 2 también contradicen los puntos 4 y 1 de esta decisión.

Consecuencias del descarte:

- La rama **no se borra**: queda en `origin` como registro. Simplemente no se mergea.
- Sus números (specs 020/021/022, decisión 010, migración 0004) quedan libres, así que la numeración de esta decisión y de las specs 021/022 no cambia.
- `src/domain/session.ts` habría conflictuado de verdad: ambas ramas editan `ACCESS_GRACE_DAYS` y `evaluateAccess`.
- **Queda un hueco real sin cubrir**: el caso del iPad que no se conecta a internet *ni una vez* durante un torneo. Sin un login online inicial no hay sesión, así que no hay acceso, y el fail-open de esta decisión no ayuda (necesita una licencia `active` previamente verificada). Esa rama lo resolvía con el login offline. Si el caso aparece en la práctica, necesita una decisión nueva: no se resuelve con lo implementado acá.

## Consequences

- Una pausa del proyecto deja de ser un incidente que bloquea al cuerpo técnico: se detecta por email de GitHub Actions antes de que algún usuario la note, y si igual pasa, la app aguanta 21 días.
- Los mensajes de bloqueo pasan a decir la verdad: "no se pudo contactar el servidor de licencias" en lugar de "revisá tu conexión".
- `evaluateAccess` gana un estado (`'unreachable'`) y una constante (`UNREACHABLE_CEILING_DAYS`). Sigue siendo una función pura y el único punto de corte del acceso.
- `AccountEntitlement` gana `unreachableSince`, que se persiste. Requiere subir `SESSION_STORE_DATA_VERSION` o tolerar su ausencia (es opcional, así que alcanza con tratar `undefined` como "nunca falló").
- Queda una limitación conocida: el techo se mide con el reloj del dispositivo, así que alguien que atrase el reloj puede extender el acceso. Ya era cierto para la gracia de 14 días; no se considera un vector realista para este grupo de usuarios y arreglarlo exigiría una fuente de tiempo confiable (es decir, red).
- **Landmine de calendario detectado**: la migración 0002 puso `expires_at = '2027-01-01'` a todas las cortesías, y `'lapsed'` es autoritativo y se evalúa local. El 1/1/2027 **todos** los usuarios de cortesía quedan bloqueados, sin importar la conectividad, hasta que Mauro corra un UPDATE y cada usuario reverifique. No se resuelve en esta decisión, pero queda registrado: hay que renovar antes de esa fecha o repensar el vencimiento.
