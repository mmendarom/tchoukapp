# Project Constitution

## 1. Objetivo

Esta app es una herramienta mobile-first y usable en tablet para que el cuerpo tecnico de tchoukball de Uruguay registre eventos en vivo, entienda patrones tacticos durante el partido, revise resumenes por tiempo y tome mejores decisiones de coaching.

Objetivos actuales del producto:

- Registrar partidos en vivo.
- Soportar el formato oficial de tchoukball: 3 tiempos de 15 minutos.
- Registrar puntos, errores, cambios y notas tacticas.
- Mostrar resumenes por tiempo y resumen final del partido.
- Ayudar a identificar donde convierte Uruguay y donde convierte el rival.
- Funcionar offline durante torneos.
- Ser rapida de usar durante un partido en vivo.

## 2. Tech Stack

Stack actual inspeccionado desde `package.json` y la estructura del proyecto:

- React `19.1.0`
- React Native `0.81.5`
- Expo `~54.0.33`
- TypeScript `~5.9.2`
- Zustand `^5.0.13` para estado local en `src/store`
- `@react-native-async-storage/async-storage` `2.2.0` para persistencia local offline-first
- React Navigation:
  - `@react-navigation/native` `^7.2.4`
  - `@react-navigation/native-stack` `^7.15.1`
- `react-native-screens` `~4.16.0`
- `react-native-safe-area-context` `~5.6.0`
- Vitest `^4.1.6` como runner de tests

Principios tecnicos:

- Offline-first por defecto.
- Sin backend por ahora.
- Sin autenticacion por ahora.
- Evitar servicios pagos y dependencias innecesarias.
- Preferir arquitectura simple, local-first y mantenible por un solo desarrollador con Codex.
- Preferir funciones puras de dominio para calculos, estadisticas, zonas e insights.
- Mantener TypeScript estricto.
- Mantener UI visible en espanol.

## 3. Commands

Comandos actuales del proyecto:

```bash
npm install
npx expo start
npm test
npx tsc --noEmit
```

Scripts disponibles en `package.json`:

```bash
npm start
npm run android
npm run ios
npm run web
npm test
```

No hay comando de lint configurado actualmente.

## 4. Git Workflow

El repositorio Git ya esta inicializado. Usar un flujo liviano para un solo desarrollador asistido por Codex:

- Mantener `main` estable.
- Crear una rama por feature, spec o fix.
- Empezar toda feature significativa desde una spec en `docs/specs`.
- Mantener commits pequenos y descriptivos.
- Preferir estilo convencional para mensajes:
  - `feat:`
  - `fix:`
  - `docs:`
  - `refactor:`
  - `test:`

Ejemplos de nombres de ramas:

- `spec/court-map-input`
- `feature/period-summary-visuals`
- `fix/timer-state-guards`

Antes de mergear o considerar terminada una tarea de codigo:

```bash
npm test
npx tsc --noEmit
```

## 5. Project Structure

Estructura actual relevante:

- `src/screens`: pantallas principales de la app, como Inicio, Partidos, Partido en vivo, Resumen del tiempo y Resumen final.
- `src/components`: componentes reutilizables de UI, por ejemplo botones, tarjetas, mapas de cancha y componentes de resumen.
- `src/domain`: modelos de dominio, datos mock, calculos puros, estadisticas, zonas de cancha, insights y tests de dominio.
- `src/store`: estado global con Zustand y acciones de partido.
- `src/storage`: adaptadores de persistencia local.
- `src/utils`: utilidades compartidas como labels, navegacion, fechas y responsive sizing.
- `docs`: documentacion de gobernanza y trabajo.
- `docs/specs`: specs de features antes de implementar.
- `docs/plans`: planes de implementacion derivados de specs aprobadas.
- `docs/decisions`: decision records / ADRs livianos.
- `assets`: assets generados por Expo.

Reglas de ubicacion futura:

- La logica de dominio, calculos, reglas tacticas e insights deben ir en `src/domain`.
- Los componentes reutilizables de UI deben ir en `src/components`.
- Las pantallas deben mantenerse en `src/screens`.
- El manejo de estado debe mantenerse en `src/store`.
- La persistencia debe quedar aislada de la UI, preferentemente en `src/storage` o dentro de adaptadores claros.
- Los insights tacticos deben implementarse como funciones puras cuando sea posible.
- Las specs nuevas deben crearse en `docs/specs`.
- Los planes de implementacion deben crearse en `docs/plans`.
- Las decisiones importantes deben documentarse en `docs/decisions`.

## 6. Boundaries / Que evitar

Evitar:

- Agregar backend antes de que sea verdaderamente necesario.
- Agregar autenticacion.
- Agregar servicios pagos.
- Agregar cloud sync.
- Agregar librerias pesadas de graficos salvo justificacion clara en una spec.
- Hardcodear `Uruguay vs Argentina` como unico flujo posible.
- Inferir la ubicacion de caida del punto desde la zona default del jugador.
- Poner calculos tacticos o estadisticos directamente dentro de componentes de UI.
- Hacer que el registro de puntos sea mas lento de lo necesario.
- Romper el uso offline.
- Hacer la UI solo comoda para tablet e incomoda en telefonos.
- Mezclar ingles y espanol en texto visible de la app.
- Cambiar reglas centrales del partido sin una spec.
- Borrar features existentes que funcionan sin instruccion explicita.

Reglas adicionales:

- Todo texto visible de la app debe estar en espanol.
- El codigo interno puede usar nombres en ingles.
- La terminologia de tchoukball debe mantenerse consistente.
- Los puntajes y resumenes deben derivarse de eventos siempre que sea posible.
- Los eventos deben conservar datos suficientes para recalcular estadisticas despues de cerrar y abrir la app.

## 7. Spec Driven Development

Antes de implementar una funcionalidad significativa:

1. Crear o actualizar una spec en `docs/specs`.
2. Aclarar problema, objetivos, no objetivos, flujo de usuario, reglas de dominio, estado, persistencia, UI esperada, pruebas y limitaciones.
3. Revisar que la spec respete esta constitucion.
4. Crear un plan corto en `docs/plans` si el trabajo requiere varios pasos.
5. Implementar en cambios pequenos y verificables.
6. Validar con TypeScript y tests.

Si durante la implementacion cambia el enfoque, actualizar la spec.

## 8. Validacion Antes De Cerrar Una Tarea

Antes de finalizar una tarea de codigo:

```bash
npx tsc --noEmit
npm test
```

Si alguna validacion no puede ejecutarse, documentar el motivo y el riesgo.

La respuesta final de Codex debe incluir:

- Archivos cambiados.
- Resumen breve de lo hecho.
- Resultados de validacion.
- Limitaciones conocidas.
