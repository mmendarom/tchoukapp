# Plan 009 - Backup local de datos

Spec relacionada: `docs/specs/009-local-backup-restore.md`

## Stage 4A - Export backup JSON

Estado: Implemented.

### Objetivo

Agregar una exportacion local JSON de datos persistidos importantes, sin implementar import/restore todavia.

### Cambios implementados

1. `src/domain/backup.ts`
   - `buildBackupData(state, options)`.
   - `buildBackupJson(backup)`.
   - `createBackupFileName(exportedAt)`.
   - Metadata: `backupVersion`, `exportedAt`, `appName`, `dataVersion`.
2. `src/export/exportBackup.ts`
   - Escribe JSON en el directorio local de Expo.
   - Abre share sheet con `expo-sharing` si esta disponible.
3. `HomeScreen`
   - Agrega accion `Exportar backup`.
   - Muestra estados `Generando backup...`, `Backup generado`, `Backup generado, pero no se pudo compartir.` y `No se pudo exportar el backup.`
4. Dependencia
   - Se agrega `expo-file-system` con `npx expo install` para escritura local compatible con Expo SDK 54.

### Datos incluidos

- `players`.
- `teamPools`.
- `matches`.
- `fixtures`.

### Datos excluidos

- `activeMatchId`.
- Estado de modales.
- Formularios temporales.
- Intervalos/timers runtime.
- Metadata privada del dispositivo.

### Tests

- Backup incluye metadata.
- Backup incluye datos persistidos.
- Backup excluye estado transitorio.
- Backup se puede serializar.
- Estado vacio no crashea.
- Filename usa fecha y extension `.json`.

## Stage 4B - Import/restore

Estado: Implemented.

### Cambios implementados

1. `src/domain/backup.ts`
   - `parseBackupJson(json)`.
   - `validateBackupData(value)`.
   - `isSupportedBackupVersion(version)`.
   - Errores controlados en espanol para JSON invalido y version incompatible.
2. `src/export/importBackup.ts`
   - Abre selector de archivos con `expo-document-picker`.
   - Lee JSON con `expo-file-system/legacy`.
   - Devuelve backup validado o error controlado.
3. `src/store/useMatchStore.ts`
   - Agrega `restoreBackupData(backup)`.
   - Reemplaza `players`, `teamPools`, `matches` y `fixtures`.
   - Limpia `activeMatchId`.
   - Normaliza datos restaurados con defaults/migraciones existentes.
   - No muta estado si la entrada es invalida.
4. `HomeScreen`
   - Agrega accion `Importar backup`.
   - Muestra picker local.
   - Muestra confirmacion `Backup valido` antes de restaurar.
   - Muestra conteos de jugadores, planteles, partidos y fixtures.
   - Advierte `Esta accion reemplazara tus datos actuales.`
   - Solo restaura al tocar `Restaurar backup`.
5. Dependencia
   - Se agrega `expo-document-picker` con `npx expo install` para seleccionar archivos locales compatible con Expo SDK 54.

### Validaciones

- JSON debe parsear.
- `backupVersion` debe ser soportado.
- `data` debe existir.
- `players`, `teamPools`, `matches` y `fixtures` deben ser arrays.
- Jugadores, planteles, partidos y fixtures deben tener campos minimos requeridos.
- Campos extra desconocidos se toleran.
- `appName` diferente genera warning, no bloqueo.

### Restauracion

- Reemplazo completo de datos persistidos de dominio.
- Sin merge selectivo en Stage 4B.
- Sin restaurar estado transitorio.
- `activeMatchId` se limpia para evitar continuar un partido stale.
- Partidos restaurados pasan por normalizacion de compatibilidad.

### Tests

- Backup valido pasa validacion.
- JSON invalido falla.
- `backupVersion` faltante o incompatible falla.
- `data` faltante o arrays faltantes fallan.
- Campos extra se toleran.
- `restoreBackupData` reemplaza datos y limpia `activeMatchId`.
- Entrada invalida no muta estado.

### Diferido

- Merge selectivo.
- Resolucion de conflictos.
- Preview detallada por partido/plantel.
- Import de versiones futuras.

## Manual QA Stage 4A

- Abrir Home.
- Tocar `Exportar backup`.
- Confirmar que aparece `Generando backup...`.
- Confirmar que se abre la hoja nativa de compartir.
- Guardar o compartir el JSON.
- Abrir el archivo si es posible.
- Confirmar que contiene:
  - `backupVersion`;
  - `exportedAt`;
  - `appName`;
  - `dataVersion`;
  - `players`;
  - `teamPools`;
  - `matches`;
  - `fixtures`.
- Confirmar que los datos de la app no se modifican.
- Crear un jugador.
- Crear o editar un plantel.
- Exportar otra vez y confirmar que aparecen los datos nuevos.
- Probar Android.
- Probar iOS/iPad si esta disponible.

## Manual QA Stage 4B

- Exportar un backup.
- Crear un jugador de prueba.
- Crear o editar un plantel de prueba.
- Tocar `Importar backup`.
- Seleccionar el backup exportado.
- Confirmar que aparece el resumen de validacion.
- Tocar `Cancelar`.
- Confirmar que los datos actuales siguen igual.
- Importar el backup otra vez.
- Tocar `Restaurar backup`.
- Confirmar `Backup restaurado correctamente.`
- Confirmar que jugadores, planteles y partidos corresponden al backup.
- Intentar importar un archivo no JSON.
- Confirmar error visible.
- Intentar importar JSON malformado.
- Confirmar error visible.
- Intentar importar `backupVersion` incompatible.
- Confirmar `Este backup no es compatible con esta versión de la app.`

## Validacion

- `npm test`.
- `npx tsc --noEmit`.

## Stage 6A - Practicas 3v3 en backup/import

Estado: Implemented.

### Alcance

- Elevar el schema de backup a v2 y aceptar backups v1 y v2.
- Exportar `trainingSessions` desde `useTrainingStore` con equipos, mini partidos, eventos, cola, settings y status.
- Normalizar backups viejos o `trainingSessions` no-array a `[]`; rechazar arrays con sesiones invalidas.
- Restaurar por reemplazo en `useTrainingStore`, usando la misma normalizacion de hidratacion.
- Excluir y limpiar `activeTrainingSessionId`; no cambiar scoring formal ni de entrenamiento.
- Preservar `archivedAt` en sesiones archivadas; sesiones eliminadas quedan fuera del backup por no existir en el store.
- Mostrar el conteo de `Practicas 3v3` y aclarar que el backup las incluye.

### QA manual Stage 6A

- Crear una sesion 3v3, equipos y al menos un mini partido.
- Registrar puntos, errores, defensas y puntos en contra.
- Exportar y confirmar `trainingSessions` en el JSON.
- Limpiar datos locales si es seguro e importar el backup.
- Confirmar sesion, equipos, historial, cola y stats restaurados.
- Confirmar que los partidos formales tambien se restauran.
- Importar un backup v1 sin `trainingSessions` y confirmar compatibilidad.
