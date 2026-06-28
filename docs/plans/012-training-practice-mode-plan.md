# Plan 012 - Modo Entrenamiento

Spec relacionada: `docs/specs/012-training-practice-mode.md`

Estado: MVP inicial implementado - quedan etapas avanzadas

## Objetivo del plan

Implementar en etapas un `Modo Entrenamiento` amplio para planificar y evaluar practicas regulares, separado de `Practica 3v3`. El modo debe empezar simple: plantel, asistencia, objetivo, bloques y notas; luego sumar tracking, resumen, backup/export e historial.

## Decision principal propuesta

Crear un modelo/store nuevo para entrenamiento general:

- `TrainingPracticeSession`;
- `TrainingBlock`;
- `TrainingPracticeEvent`;
- `TrainingPracticeMetric`;
- `usePracticeStore` o nombre equivalente.

No reutilizar como entidad principal:

- `Match`, porque modela partidos formales;
- `TrainingSession` 3v3, porque modela mini partidos con score, equipos y rotacion.

## Stages

### Stage 0 - Planning/docs only

Estado: Completado.

Objetivo:

- Crear spec.
- Crear plan.
- Actualizar implementation log.
- No tocar codigo productivo.

Archivos:

- `docs/specs/012-training-practice-mode.md`;
- `docs/plans/012-training-practice-mode-plan.md`;
- `docs/implementation-log.md`.

Validacion:

- `git diff --check`.
- No correr `npm test` ni `npx tsc --noEmit` si solo cambiaron docs.

### Stage 1 - Domain model y store

Estado: Completado en primer corte.

Objetivo:

- Agregar tipos, validaciones, lifecycle basico y store persistido offline-first.

Archivos probables:

- Nuevo `src/domain/practice.ts` o `src/domain/trainingPractice.ts`.
- Nuevo `src/domain/practice.test.ts`.
- Nuevo `src/store/usePracticeStore.ts`.
- Nuevo `src/store/usePracticeStore.test.ts`.
- `src/storage/asyncStorage.ts`.

Implementar:

- `TrainingPracticeSession`.
- `TrainingBlock`.
- `TrainingPracticeEvent`.
- `TrainingPracticeMetric`.
- Normalizadores:
  - ids unicos;
  - asistentes sin duplicados;
  - bloques ordenados;
  - status seguro.
- Acciones:
  - `createPracticeSession`;
  - `updatePracticeSession`;
  - `startPracticeSession`;
  - `finishPracticeSession`;
  - `cancelPracticeSession`;
  - `archivePracticeSession`;
  - `unarchivePracticeSession`;
  - `deletePracticeSession`;
  - `addPracticeBlock`;
  - `updatePracticeBlock`;
  - `reorderPracticeBlocks`;
  - `addPracticeNote`;
  - `resetPracticeData`.

Tests:

- crear sesion valida;
- bloquear sesion sin plantel/asistentes si se define como obligatorio;
- asistentes sin duplicados;
- bloques ordenados;
- lifecycle de sesion;
- archive/restore/delete;
- persistencia y migracion.

### Stage 2 - Setup UI

Estado: Completado en primer corte.

Objetivo:

- Permitir crear entrenamientos desde Home.

Archivos probables:

- `src/screens/HomeScreen.tsx`;
- nueva pantalla `src/screens/PracticeSessionsScreen.tsx`;
- posible `src/screens/PracticeSetupScreen.tsx`;
- `src/utils/navigation.ts`;
- `App.tsx`;
- componentes reutilizables en `src/components` si el formulario crece.

Flujo:

1. Home -> `Entrenamiento`.
2. Ver sesiones guardadas.
3. Crear entrenamiento.
4. Elegir plantel.
5. Marcar asistencia.
6. Escribir objetivo.
7. Agregar bloques:
   - titulo;
   - tipo;
   - duracion estimada;
   - objetivo;
   - participantes opcionales;
   - notas opcionales.
8. Guardar borrador o iniciar.

UX:

- Botones grandes y textos en espanol.
- Evitar formularios largos sin agrupacion.
- Mantener `Practica 3v3` visible y separada para mini partidos.

QA manual:

- Crear entrenamiento con `Mayores`.
- Marcar varios asistentes.
- Agregar 3 bloques.
- Guardar, salir, volver y confirmar persistencia.

### Stage 3 - Live/simple tracking

Estado: Parcial. El detalle permite iniciar/completar/saltar bloques sin una pantalla live dedicada.

Objetivo:

- Registrar el desarrollo de la practica sin volver lenta la cancha.

Archivos probables:

- `src/screens/LivePracticeSessionScreen.tsx`.
- `src/domain/practice.ts`.
- `src/store/usePracticeStore.ts`.
- tests de dominio/store.

Implementar:

- Iniciar sesion.
- Iniciar/finalizar bloque.
- Saltar bloque.
- Agregar nota rapida a bloque.
- Agregar nota general.
- Marcar jugador destacado.
- Marcar jugador para seguimiento.
- Opcional: metricas simples por bloque si el flujo sigue rapido.

No implementar todavia:

- mapas;
- eventos tacticos complejos;
- PDF;
- integracion live con 3v3.

Tests:

- solo un bloque live a la vez;
- finalizar bloque setea `endedAt`;
- notas se conservan;
- destacados por jugador se resumen;
- cancelar sesion no borra datos inesperadamente.

QA manual:

- Iniciar entrenamiento.
- Iniciar bloque 1.
- Agregar nota.
- Marcar destacado.
- Finalizar bloque.
- Saltar bloque.
- Finalizar sesion.

### Stage 4 - Summary

Objetivo:

- Mostrar resumen util inmediatamente despues de terminar.

Archivos probables:

- Nuevo `src/domain/practiceSummary.ts`.
- Nuevo `src/domain/practiceSummary.test.ts`.
- `src/screens/PracticeSessionsScreen.tsx`.
- posible `src/screens/PracticeSummaryScreen.tsx`.

Resumen:

- fecha;
- plantel;
- objetivo;
- asistentes y ausentes del plantel;
- bloques planificados/completados/salteados;
- minutos planificados vs realizados si hay timestamps;
- notas;
- destacados;
- jugadores para seguimiento;
- metricas basicas si existen.

Tests:

- asistencia y ausencias;
- bloques completados/salteados;
- notas vacias seguras;
- eventos incompletos no rompen;
- orden estable.

QA manual:

- Crear sesion con asistentes.
- Completar algunos bloques.
- Revisar resumen.
- Confirmar textos en espanol y legibilidad mobile.

### Stage 5 - Integration, backup y export

Estado: Backup JSON completado. Export de resumen/PDF sigue pendiente.

Objetivo:

- Hacer el modo durable antes de uso real y compartir resumen simple.

Archivos probables:

- `src/domain/backup.ts`;
- `src/domain/backup.test.ts`;
- `src/export/exportBackup.ts`;
- `src/export/importBackup.ts`;
- `src/screens/HomeScreen.tsx`;
- nuevo `src/export/practiceShareText.ts`;
- nuevo `src/export/practiceShareText.test.ts`.

Implementar:

- Agregar `practiceSessions` al backup.
- Restore reemplaza/normaliza sesiones de entrenamiento.
- Backups viejos sin `practiceSessions` importan como `[]`.
- Texto compartible:
  - objetivo;
  - asistencia;
  - bloques;
  - notas;
  - destacados.

Decision:

- No considerar el modo listo para campo hasta que backup incluya entrenamientos.

QA manual:

- Crear entrenamiento.
- Exportar backup.
- Restaurar backup.
- Confirmar sesiones, notas y bloques.
- Compartir resumen por WhatsApp/notas.

### Stage 6 - Templates y progreso acumulado

Objetivo:

- Reducir carga de setup y empezar lectura historica.

Opciones:

- Duplicar entrenamiento anterior.
- Templates livianos:
  - `Entrenamiento seleccion`;
  - `Tecnica + defensa`;
  - `Fisico + transicion`;
  - `Pre partido`.
- Historial de asistencia por jugador.
- Conteo de destacados/seguimientos por jugador.

Archivos probables:

- nuevo `src/domain/practiceHistory.ts`;
- nuevo `src/domain/practiceHistory.test.ts`;
- pantallas o secciones de historial.

Tests:

- asistencia acumulada por rango;
- sesiones archivadas incluidas solo si el filtro lo pide;
- progreso derivado de sesiones, no duplicado.

### Stage 7 - Advanced tracking

Objetivo:

- Agregar metricas tecnicas por ejercicio solo si el MVP simple ya se usa bien.

Opciones:

- metricas por jugador:
  - repeticiones;
  - aciertos;
  - errores;
  - defensas;
  - tiros;
  - recepciones;
- mapas de ataque/defensa por bloque;
- vincular una `Practica 3v3` existente como bloque `scrimmage`;
- PDF completo de entrenamiento;
- evolucion por jugador.

Riesgo:

- Si esta etapa entra demasiado pronto, puede volver lenta la practica. Requiere feedback de campo.

## Likely files impacted

Dominio:

- nuevo `src/domain/practice.ts`;
- nuevo `src/domain/practiceSummary.ts`;
- nuevo `src/domain/practiceHistory.ts` en etapas futuras;
- `src/domain/backup.ts` en Stage 5.

Store:

- nuevo `src/store/usePracticeStore.ts`;
- `src/storage/asyncStorage.ts`.

UI:

- `src/screens/HomeScreen.tsx`;
- nueva `src/screens/PracticeSessionsScreen.tsx`;
- nueva `src/screens/LivePracticeSessionScreen.tsx`;
- posible `src/screens/PracticeSummaryScreen.tsx`;
- `src/utils/navigation.ts`;
- `App.tsx`.

Export:

- nuevo `src/export/practiceShareText.ts`;
- PDF futuro en `src/export/practiceReportHtml.ts` y `src/export/exportPracticeReport.ts` solo si se aprueba.

Tests:

- `src/domain/practice.test.ts`;
- `src/store/usePracticeStore.test.ts`;
- `src/domain/practiceSummary.test.ts`;
- `src/domain/backup.test.ts`;
- `src/export/practiceShareText.test.ts`.

## Test strategy

Prioridad:

1. Dominio puro.
2. Store y persistencia.
3. Backup/import.
4. Builders de resumen/export.
5. QA manual de UI.

Evitar:

- snapshots fragiles de UI;
- duplicar calculos de resumen dentro de pantallas;
- persistir estadisticas derivadas como fuente de verdad.

## Manual QA checklist

- Abrir Home.
- Confirmar `Entrenamiento` separado de `Practica 3v3`.
- Crear entrenamiento.
- Elegir plantel `Mayores`.
- Marcar asistentes.
- Escribir objetivo.
- Agregar bloques de ataque, defensa y tactico.
- Guardar borrador.
- Cerrar y reabrir app.
- Iniciar entrenamiento.
- Iniciar y finalizar bloques.
- Agregar notas por bloque.
- Marcar destacados/seguimiento.
- Finalizar entrenamiento.
- Revisar resumen.
- Archivar/restaurar.
- Eliminar con confirmacion.
- Exportar/importar backup cuando Stage 5 este implementado.
- Confirmar que partidos formales y `Practica 3v3` siguen funcionando.

## Migration / backup considerations

- Usar storage separado para el modo nuevo.
- `practiceSessions` debe agregarse al backup antes de release real.
- Import de backups viejos debe tolerar ausencia de `practiceSessions`.
- Restore debe normalizar sesiones y limpiar ids activos transitorios.
- Archivar no debe borrar datos.
- Delete debe requerir confirmacion visible.
- No mezclar `trainingSessions` 3v3 con `practiceSessions` general.

## Decisions needed before coding

- Nombre tecnico elegido:
  - `TrainingPracticeSession`;
  - `TrainingBlock`;
  - `usePracticeStore`.
- Nombre visible elegido:
  - `Entrenamiento`;
  - `Modo Entrenamiento`.
- `Practica 3v3` queda como card separada dentro de la seccion `Entrenamiento` de Home.
- Asistencia minima obligatoria para guardar.
- Objetivo obligatorio para guardar.
- Al menos un bloque obligatorio para guardar.
- Duracion de bloques opcional.
- Si Stage 3 incluye metricas numericas o solo notas/destacados.
- Si templates entran como duplicar sesion o modelo propio.
- Backup se implemento desde el primer corte usable.

## Criterios de salida del MVP

- Se puede crear un entrenamiento regular sin usar mini partidos.
- Se puede marcar asistencia desde planteles existentes.
- Se pueden agregar bloques/ejercicios.
- Se pueden registrar notas.
- Se puede finalizar y ver resumen.
- Todo persiste offline.
- El modo esta incluido en backup antes de uso real.
- `Practica 3v3` sigue funcionando como modo separado.
- No se afecta el flujo formal de partido.
