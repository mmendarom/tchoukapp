# Plan 020 - Reestructura UI de la sección Práctica 3v3

Spec: `docs/specs/020-training-3v3-ui-restructure.md`

## Pasos

1. Rutas
   - `src/utils/navigation.ts`: agregar `TrainingSetup: undefined` y `TrainingSessionDetail: { sessionId: string }`.
   - `App.tsx`: registrar `TrainingSetupScreen` (título `Nueva práctica`) y `TrainingSessionDetailScreen` (título `Práctica 3v3`).
2. `src/screens/TrainingSessionsScreen.tsx`
   - Reescribir como home de la sección: header, CTA `Nueva práctica`, tarjeta `Práctica en curso`, filtros + lista navegable, estado vacío explicativo.
   - Eliminar de esta pantalla el detalle y el formulario de creación.
3. `src/screens/TrainingSetupScreen.tsx` (nuevo)
   - Asistente de 3 pasos con estado local; reutiliza `trainingSetup.ts` y `useTrainingStore.createTrainingSession`.
   - Al crear: `navigation.replace('TrainingSessionDetail', { sessionId })`.
4. `src/screens/TrainingSessionDetailScreen.tsx` (nuevo)
   - Mover del archivo original: detalle, zona de juego (activo/sugerido/manual/cola), stats, historial, gestión (compartir, PDF, editar, archivar, eliminar).
   - Archivar/eliminar hace `goBack()` a la lista.
5. `src/screens/LiveTrainingMiniMatchScreen.tsx`
   - `Volver a la sesión` navega a `TrainingSessionDetail` cuando hay sesión; fallback a `TrainingSessions` si no se encontró.
6. Validación: `npm test`, `npx tsc --noEmit`, revisión manual del flujo.
7. Docs: `docs/implementation-log.md` + nota en spec 011.

## Riesgos

- Estado local del asistente se pierde al salir (aceptado: flujo corto).
- Ningún cambio de dominio/store: riesgo de regresión de datos nulo.
