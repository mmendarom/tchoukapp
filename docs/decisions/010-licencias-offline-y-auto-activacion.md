# Decision: Uso offline en torneo, gracia larga y altas auto-activas

## Date

2026-07-23

## Status

Accepted

## Context

Para un torneo, la app se usa en un iPad **sin internet en ningún momento**. Con
backend configurado (el caso del APK), el login es solo online y el acceso
offline dura 14 días. El admin además quiere que todas las licencias (activas y
nuevas) queden vigentes hasta el año que viene sin aprobación manual. Se preguntó
al usuario y eligió: (1) necesita entrar sin conexión nunca; (2) vigencia hasta
fin de 2027; (3) altas nuevas automáticamente activas.

## Decision

1. **Ingreso sin conexión**: aun con backend configurado, `WelcomeScreen` ofrece
   un modo local (perfil sin `accountId` → `evaluateAccess` = `local` → acceso
   completo offline, sin servidor).
2. **Gracia offline extendida**: `ACCESS_GRACE_DAYS` 14 → 730 días, de modo que
   el límite efectivo de una licencia de cuenta pase a ser su `expiresAt`.
3. **Vigencia y auto-activación (SQL 0004)**: todas las licencias vencen
   2027-12-31; las `pending` pasan a `active` (las `revoked` no se tocan); y el
   trigger de alta crea las nuevas ya `active`.

## Consequences

- El iPad entra y funciona 100% offline sin depender del backend.
- Ninguna cuenta del staff queda bloqueada durante el torneo.
- **Cualquiera que se registre con un email queda activo automáticamente.** Para
  sacar acceso hay que revocar individualmente desde el Perfil (spec 016). Esto
  afloja la postura de "activación manual" de la decisión 007, a propósito y de
  forma reversible.
- La reverificación online deja de ser un control frecuente (gracia de ~2 años);
  el corte real es `expiresAt`.

## Alternatives considered

- **Solo extender la gracia** sin login offline: no alcanza si el iPad no se
  conecta ni una vez (sin login online no hay sesión).
- **Mantener activación manual**: contradice el pedido de "todas vigentes
  automáticamente" y agrega fricción en el torneo.
- **Bajar `ACCESS_GRACE_DAYS` a un valor medio**: no cubriría meses offline hasta
  el vencimiento de fin de 2027.
