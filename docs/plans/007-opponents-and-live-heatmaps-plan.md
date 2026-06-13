# Plan: Editable opponents and live maps/statistics

Spec relacionada: `docs/specs/007-opponents-and-live-heatmaps.md`

Estado: Draft

## Objetivo

Implementar rivales editables y mapas/estadisticas en vivo en etapas pequenas, sin romper el MVP estable ni cambiar reglas de score, ubicaciones o persistencia offline.

## Areas a inspeccionar antes de implementar

- `src/domain/types.ts`
- `src/domain/mockData.ts`
- `src/store/useMatchStore.ts`
- `src/screens/MatchesScreen.tsx`
- `src/screens/LiveMatchScreen.tsx`
- `src/screens/PeriodSummaryScreen.tsx`
- `src/screens/FinalSummaryScreen.tsx`
- `src/screens/MatchDashboardScreen.tsx`
- `src/components/CourtMapSummary.tsx`
- `src/domain/court.ts`
- `src/domain/periodStats.ts`
- `src/domain/stats.ts`
- `src/domain/reportData.ts`
- `src/export/reportHtml.ts`
- tests existentes de dominio/store/export

## Hallazgos actuales

- `Match` ya tiene `opponent: string`.
- La creacion actual de partido usa `createDemoMatch()` con `opponent: 'Argentina'`.
- La lista de partidos muestra `Uruguay vs {match.opponent}`.
- Marcador, resumenes, dashboard y reporte ya leen `match.opponent` en varios puntos.
- `reportData.ts` ya usa fallback `Rival` en algunos datos de reporte.
- Los mapas de resumen ya usan datos de ubicacion reales:
  - puntos de Uruguay;
  - puntos del rival;
  - defensas del rival.
- `LiveMatchScreen` todavia no muestra mapas/estadisticas tacticas live.
- Defensas de Uruguay solo guardan jugador, no ubicacion.

## Stage 1 - Rival editable en creacion de partido

### Cambios propuestos

Estado: Implemented para texto libre en `Match.opponent`. CRUD y rivales recientes siguen diferidos.

1. Agregar flujo simple de creacion de partido desde `MatchesScreen`.
2. Pedir nombre de rival con texto libre.
3. Crear un partido local usando `Match.opponent`.
4. Mantener `createDemoMatch()` como helper/demo con `Argentina`.
5. Agregar fallback `Rival` en UI/dominio donde falte `opponent`.
6. Verificar que marcador, resumenes, dashboard, PDF y texto compartido usen el rival elegido.

### Enfoque tecnico sugerido

- Se agrego accion de store `createMatch(input)` sin romper `createDemoMatch`.
- Input minimo:
  - `opponent`.
  - opcionalmente `venue`.
  - opcionalmente `startsAt`.
- Normalizar texto:
  - trim;
  - si queda vacio, usar `Rival`.
- Mantener offline-first con Zustand persistido.
- No agregar entidad nueva para rivales en esta etapa.
- Usar `Match.opponent` como campo estable; no introducir `opponentName` duplicado.

### Tests sugeridos

- Crear partido con rival custom.
- Crear partido con rival vacio y verificar fallback.
- Verificar demo sigue usando `Argentina`.
- Verificar migracion/normalizacion de partido viejo sin rival.
- Verificar report data/export con rival custom.

### Manual QA

- Crear partido vs `Chile`.
- Iniciar partido.
- Verificar marcador `Chile`.
- Finalizar tiempo y verificar resumen.
- Finalizar partido y verificar resumen final.
- Exportar PDF y compartir texto.
- Crear partido con rival vacio y verificar fallback `Rival`.
- Reiniciar datos demo y verificar que el demo sigue usando `Argentina`.

## Stage 2 - Rivales recientes locales opcionales

### Cambios propuestos

1. Evaluar si alcanza derivar rivales recientes desde `matches`.
2. Mostrar sugerencias recientes al crear partido.
3. Mantener campo libre siempre disponible.
4. Evitar CRUD completo hasta tener necesidad real.

### Enfoque tecnico sugerido

- Opcion preferida inicial: derivar lista de rivales recientes desde partidos persistidos.
- Si se necesita entidad propia mas adelante, definir tipo local simple:
  - `id`;
  - `name`;
  - `lastUsedAt`.
- No backend.
- No sincronizacion.

### Tests sugeridos

- Rival usado aparece como sugerencia reciente.
- Seleccionar sugerencia crea partido con ese rival.
- Texto libre sigue funcionando.
- Duplicados por mayusculas/espacios se manejan de forma razonable.

## Stage 3 - Mapas y estadisticas en vivo

### Cambios propuestos

Estado: Implemented para el panel de mapas live de tiempo actual. Las estadisticas adicionales de defensas Uruguay/faltas quedan como mejora posterior si no saturan la pantalla.

1. Agregar panel `Mapas en vivo` en `LiveMatchScreen`.
2. En tablet landscape, ubicar el panel bajo los botones de accion en la columna izquierda.
3. En telefono, mostrar el panel como seccion colapsable mas abajo para no afectar el registro.
4. Mostrar un mapa por vez con tabs:
   - `Combinado`;
   - `Puntos nuestros`;
   - `Puntos rivales`;
   - `Defensas rivales`.
5. Usar `Combinado` como tab por defecto.
6. `Combinado` superpone puntos Uruguay, puntos rival y defensas rivales con colores distintos.
7. Mostrar datos del tiempo actual solamente.
8. Filtrar mapas a eventos con ubicacion real.
9. No mostrar defensa Uruguay como mapa.
10. Si queda espacio, mostrar defensas Uruguay como conteo por jugador en una iteracion posterior.

### Enfoque tecnico sugerido

- Calcular datos con funciones de `src/domain`, no dentro de JSX.
- Usar eventos del partido actual como fuente de verdad.
- Filtrar con `getEventsByPeriod(match.events, match.currentPeriod)` o helper puro equivalente.
- Reutilizar `CourtField`/`CourtMapSummary` extrayendo un componente reusable si hace falta.
- En telefono, iniciar colapsado para proteger velocidad de registro.
- En tablet landscape, mostrar abierto porque usa espacio libre bajo acciones.
- Quitar los labels `Mapas en vivo` y `Tiempo actual` del panel para reducir ruido visual.
- No persistir el tab seleccionado.
- Dejar `Partido completo` como mejora futura.

### Eventos que entran en mapas

- Uruguay points con `landingLocation`.
- Rival points con `landingLocation`.
- Rival defenses con `defenseLocation`.
- `Combinado` incluye los tres grupos anteriores.

### Eventos que no entran en mapas

- `Punto en contra`.
- `Punto en contra rival`.
- Defensa Uruguay.
- Sustituciones.
- Faltas.
- `Defensas nuestras` como heatmap queda diferido porque no se registra ubicacion.

### Tests sugeridos

- Helper live selecciona puntos Uruguay con ubicacion del tiempo actual.
- Helper live selecciona puntos rival con ubicacion del tiempo actual.
- Helper live selecciona defensas del rival con ubicacion del tiempo actual.
- Helper live ignora eventos de otros tiempos.
- Helper live ignora `Punto en contra`.
- Helper live ignora `Punto en contra rival`.
- Helper live ignora defensa Uruguay.
- Eventos viejos sin ubicacion no crashean ni cuentan.
- Helper combinado incluye puntos Uruguay, puntos rival y defensas rivales del tiempo actual.
- Helper combinado excluye defensas Uruguay, puntos en contra, puntos en contra rival y eventos sin ubicacion.
- Undo queda cubierto porque los datos son derivados del event stream actual.

### Manual QA

- Registrar puntos y defensas rivales en distintas zonas.
- Abrir `Mapas en vivo`.
- Verificar marcadores correctos.
- Confirmar que no aparecen `Mapas en vivo` ni `Tiempo actual`.
- Confirmar que `Combinado` aparece primero y queda seleccionado por defecto.
- Cambiar entre `Combinado`, `Puntos nuestros`, `Puntos rivales` y `Defensas rivales`.
- Verificar que `Combinado` muestra los tres datasets con leyenda azul/rojo/violeta.
- Registrar defensa Uruguay y verificar conteo por jugador.
- Registrar puntos en contra y verificar que no aparecen en mapas.
- Usar `Deshacer` y verificar que el mapa se actualiza.
- Iniciar un nuevo tiempo y verificar que el panel muestra datos del tiempo actual.
- Probar registrar acciones mientras la seccion esta colapsada y abierta.

## Stage 4 - Pulido tablet landscape

### Cambios propuestos

1. Ajustar layout de `LiveMatchScreen` para tablet landscape.
2. Priorizar:
   - marcador;
   - acciones;
   - jugador seleccionado/cancha;
   - mapas/estadisticas como informacion secundaria.
3. Evitar que mapas empujen controles importantes fuera del viewport.
4. Mantener safe areas y barras nativas.

### Tests y QA sugeridos

- Tablet landscape con mapas colapsados.
- Tablet landscape con mapas abiertos.
- Telefono portrait con mapas colapsados.
- Telefono portrait con mapas abiertos.
- Registrar punto Uruguay/rival/defensa rival con mapas abiertos.
- Verificar que botones siguen comodos.

## Riesgos y puntos donde detenerse

- Si el formulario de creacion empieza a pedir demasiados datos, detener y separar otra spec.
- Si `CourtMapSummary` no se adapta bien al contexto live, crear wrapper liviano sin duplicar logica.
- Si el live screen queda saturado, dejar mapas colapsados por defecto y priorizar acciones.
- Si aparece necesidad de CRUD completo de rivales, abrir decision/spec separada.

## Validacion final por etapa

- `npm test`
- `npx tsc --noEmit`
- QA manual en Expo Go:
  - telefono portrait;
  - telefono landscape si aplica;
  - tablet/iPad landscape.

## Documentacion a actualizar al implementar

- `docs/specs/007-opponents-and-live-heatmaps.md`
- `docs/implementation-log.md`
- `docs/decisions/*` si se decide persistir rivales como entidad propia o cambiar el formato de creacion.
