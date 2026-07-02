# 006 - Rebrand TCHOUKAPP con login local y monetizacion diferida

- Estado: aceptada
- Fecha: 2026-07-01
- Contexto: spec `014-tchoukapp-rebrand-login`

## Contexto

Se quiere lanzar la app al publico con suscripcion mensual por usuario, manteniendo gratis el acceso para un grupo de companeros. La constitucion actual dice "sin backend, sin autenticacion, sin servicios pagos", y la app es offline-first para torneos.

## Decision

1. **Login local, no autenticacion real.** La portada pide nombre (y email opcional) y guarda un `UserProfile` en AsyncStorage. No hay backend ni verificacion. Es identidad de usuario en el dispositivo, suficiente para personalizar la app y para modelar el acceso por usuario.
2. **El plan de acceso vive en el dominio desde hoy.** `UserPlan = 'cortesia' | 'suscripcion'` y `hasActiveAccess(profile)` son el unico punto de corte previsto para la suscripcion futura. Hoy `hasActiveAccess` siempre devuelve `true`; cuando exista backend de licencias, solo cambia esa funcion (con periodo de gracia offline).
3. **Monetizacion diferida.** No se integra pago, backend ni codigos de activacion ahora. El camino documentado: backend minimo de licencias o RevenueCat + lista de cortesia administrada por Mauro. Cualquier chequeo futuro debe degradar con gracia sin conexion (torneos offline).
4. **Rename parcial de identificadores.** El nombre visible pasa a `TCHOUKAPP` (display `TchoukApp` en `app.json`), pero se mantienen `slug: tchoukball-uruguay`, `bundleIdentifier` y `package` `com.mauromendaro.tchoukballuruguay`. Cambiar el slug rompe el vinculo con el proyecto EAS (`projectId` existente) y cambiar los identificadores nativos invalida las builds instaladas. Antes del primer lanzamiento publico en tiendas se puede reevaluar el `package`/`bundleIdentifier` (es el ultimo momento barato para cambiarlo); quedara como tarea explicita de release.
5. **El perfil no entra al backup JSON.** El backup transporta datos deportivos entre dispositivos y personas; la sesion es local a cada dispositivo. `BACKUP_APP_NAME` pasa a `TchoukApp` aceptando `Tchoukball Uruguay` como nombre legado para no generar advertencias falsas al importar backups viejos.

## Consecuencias

- La app queda personalizada por usuario sin romper offline-first ni agregar dependencias.
- El login local no protege datos (cualquiera con el dispositivo entra); si algun dia hace falta proteccion real, requerira autenticacion con backend.
- La futura suscripcion tiene un punto de integracion unico (`hasActiveAccess`) y una decision pendiente de release (identificadores nativos) documentada.
