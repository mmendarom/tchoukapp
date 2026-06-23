# Spec 009 - Backup local de datos

## Estado

Stage 6A implemented: practicas 3v3 incluidas

## Contexto

La app funciona offline-first y guarda datos importantes en el dispositivo: jugadores, planteles, partidos, eventos, alineaciones, fixtures y sesiones de practica 3v3. Los reportes PDF/texto se derivan de esos datos.

El riesgo actual es que si el usuario borra almacenamiento local, cambia de dispositivo, reinstala Expo Go o pierde el estado local, se pierden jugadores, planteles y partidos cargados.

## Problema

Los datos locales no tienen hoy una forma simple de respaldo fuera del dispositivo.

## Objetivos

- Permitir exportar un backup local JSON.
- Permitir importar/restaurar un backup JSON generado por la app.
- Incluir datos persistidos relevantes para restaurar datos locales.
- Mantener el backup offline-first.
- Compartir/guardar el archivo con la hoja nativa del sistema.
- Mantener la logica de backup fuera de componentes UI.
- No mutar ni sobrescribir datos existentes.
- No restaurar datos sin validacion y confirmacion del usuario.

## No objetivos

- No resolver merge/conflictos de restauracion en Stage 4B.
- No hacer importacion parcial.
- No agregar backend, auth, cloud sync ni servicios pagos.
- No cambiar tracking, scoring, mapas, sustituciones, timer, resumenes ni PDF de partido.

## Usuarios / Casos de uso

- El entrenador exporta un JSON para guardarlo en Drive, Archivos o enviarlo por WhatsApp.
- Antes de probar cambios, el usuario genera un respaldo de jugadores, planteles y partidos.
- El usuario importa un backup anterior y confirma que quiere reemplazar datos actuales.

## Flujo esperado

1. Usuario abre Inicio.
2. Toca `Exportar backup`.
3. La app muestra `Generando backup...`.
4. La app crea un archivo JSON local.
5. Si compartir esta disponible, abre la hoja nativa.
6. Al finalizar muestra `Backup generado`.
7. Si el archivo se genera pero no hay share sheet, muestra `Backup generado, pero no se pudo compartir.`
8. Si falla, muestra `No se pudo exportar el backup.`

Flujo de importacion Stage 4B:

1. Usuario abre Inicio.
2. Toca `Importar backup`.
3. La app abre el selector de archivos.
4. Usuario elige un JSON.
5. La app parsea y valida el backup.
6. Si el backup es valido, muestra resumen:
   - `Jugadores`;
   - `Planteles`;
   - `Partidos`;
   - `Fixtures`;
   - `Practicas 3v3`;
   - `Exportado`.
7. Muestra advertencia: `Esta accion reemplazara tus datos actuales.`
8. Usuario puede `Cancelar` o `Restaurar backup`.
9. La app restaura solo si el usuario confirma.
10. Al finalizar muestra `Backup restaurado correctamente.`

## Requisitos funcionales

- El backup debe incluir:
  - `players`;
  - `teamPools`;
  - `matches`;
  - `fixtures`;
  - `trainingSessions`.
- El backup debe incluir metadata:
  - `backupVersion`;
  - `exportedAt`;
  - `appName`;
  - `dataVersion`.
- El archivo debe llamarse `tchoukball-uruguay-backup-YYYY-MM-DD.json`.
- La exportacion no debe modificar datos del store.
- Si `expo-sharing` no esta disponible, la app no debe crashear.
- `Importar backup` debe usar un picker de archivos local.
- El backup debe validarse antes de restaurar.
- `backupVersion` incompatible debe rechazar con `Este backup no es compatible con esta version de la app.`
- JSON invalido o estructura invalida debe rechazar con `No se pudo importar el backup.`
- La restauracion debe reemplazar:
  - `players`;
  - `teamPools`;
  - `matches`;
  - `fixtures`;
  - `trainingSessions` en su store separado.
- La restauracion no debe restaurar `activeMatchId`.
- La restauracion debe limpiar `activeMatchId` para evitar estado activo stale.
- La restauracion no debe restaurar `activeTrainingSessionId` y debe limpiarlo por la misma razon.
- Backups v1 sin `trainingSessions` deben seguir siendo compatibles y restaurar `[]`.
- `trainingSessions` ausente o con un valor que no sea array se normaliza a `[]`; si el array contiene una sesion invalida, el backup se rechaza antes de mutar stores.
- La restauracion debe normalizar datos restaurados con migraciones/defaults existentes.
- Archivos con campos extra desconocidos deben tolerarse si la estructura base es valida.

## Requisitos no funcionales

- Offline-first.
- TypeScript estricto.
- Texto visible en espanol.
- Sin backend/cloud.
- Sin dependencias innecesarias.
- JSON legible con indentacion.

## Impacto en modelo de datos

No cambia el modelo persistido.

Estructura vigente desde Stage 6A:

```ts
{
  backupVersion: 2,
  exportedAt: string,
  appName: 'Tchoukball Uruguay',
  dataVersion: number,
  data: {
    players: Player[],
    teamPools: TeamPool[],
    matches: Match[],
    fixtures: Fixture[],
    trainingSessions: TrainingSession[]
  }
}
```

## Impacto en UI

- Home agrega la accion `Exportar backup`.
- Estados visibles:
  - `Generando backup...`;
  - `Backup generado`;
  - `Backup generado, pero no se pudo compartir.`;
  - `No se pudo exportar el backup.`
- Home agrega la accion `Importar backup`.
- Estados visibles:
  - `Seleccionando archivo...`;
  - `Backup valido`;
  - `Backup restaurado correctamente.`;
  - `No se pudo importar el backup.`;
  - `Este backup no es compatible con esta version de la app.`
- Antes de restaurar, se muestra modal de confirmacion con resumen y advertencia.

## Impacto en estado/persistencia

- No se agrega estado persistido nuevo: `useTrainingStore` ya persiste por separado.
- El backup se construye desde el estado actual.
- No se incluye estado transitorio como `activeMatchId`, `activeTrainingSessionId`, modales, formularios o timers runtime.
- Al restaurar, `players`, `teamPools`, `matches`, `fixtures` y `trainingSessions` se reemplazan; no hay merge.
- Al restaurar, `activeMatchId` y `activeTrainingSessionId` se limpian.
- Si la validacion falla, no se muta el estado actual.

## Testing plan

- Backup incluye jugadores.
- Backup incluye planteles.
- Backup incluye partidos.
- Backup incluye fixtures.
- Backup incluye sesiones 3v3 completas: equipos, mini partidos, eventos, cola, settings y status.
- Backup incluye sesiones archivadas y preserva `archivedAt`; sesiones eliminadas no se exportan.
- Backup incluye metadata.
- Backup excluye estado transitorio.
- Backup se puede serializar con `JSON.stringify`.
- Backup de estado vacio no crashea.
- Backup valido pasa validacion.
- JSON invalido falla validacion.
- `backupVersion` faltante o incompatible falla validacion.
- `data` faltante o arrays requeridos faltantes fallan validacion.
- Campos extra desconocidos se toleran.
- `restoreBackupData` reemplaza datos persistidos.
- `restoreBackupData` limpia `activeMatchId`.
- `restoreBackupData` no muta estado con entrada invalida.
- Backup v1 sin `trainingSessions` restaura sesiones como `[]`.
- Restore de training normaliza sesiones y limpia `activeTrainingSessionId`.

## Riesgos

- El share sheet puede no estar disponible en algunas plataformas.
- El document picker puede comportarse distinto entre Android/iOS/web.
- El archivo JSON puede crecer si hay muchos partidos.
- Stage 4B reemplaza datos completos; no hay merge selectivo.

## Preguntas abiertas

- Como se resolveran duplicados/conflictos al importar?
- Conviene permitir elegir destino directamente en vez de share sheet?
- Se debe comprimir el backup si crece demasiado?
- Conviene agregar preview mas detallada por partido/plantel antes de restaurar?

## Plan de implementacion

Ver `docs/plans/009-local-backup-restore-plan.md`.

## Checklist de aceptacion

- [x] Existe builder puro de backup.
- [x] Existe exportador JSON local.
- [x] Home muestra `Exportar backup`.
- [x] Backup incluye `players`, `teamPools`, `matches` y `fixtures`.
- [x] Backup incluye metadata.
- [x] Backup excluye estado transitorio.
- [x] No se muta el store.
- [x] Home muestra `Importar backup`.
- [x] Import usa selector local de archivos.
- [x] Backup se valida antes de restaurar.
- [x] Se muestra resumen y confirmacion antes de reemplazar datos.
- [x] Restaurar reemplaza `players`, `teamPools`, `matches` y `fixtures`.
- [x] Restaurar limpia `activeMatchId`.
- [x] Backup incluye y restaura `trainingSessions`.
- [x] Backups v1 sin sesiones siguen siendo compatibles.
- [x] Restaurar reemplaza las sesiones y limpia `activeTrainingSessionId`.
- [x] Archivos invalidos no mutan el store.
- [x] `npm test` pasa.
- [x] `npx tsc --noEmit` pasa.
