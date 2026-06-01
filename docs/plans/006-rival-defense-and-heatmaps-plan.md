# Plan 006 - Defensa rival y mapas visuales

## Estado

Implemented

## Alcance

Implementar el primer slice completo y seguro de `Defensa rival`:

- evento persistido `opponent_defense`;
- flujo en vivo con acciones divididas y mapa;
- stats puros;
- mapas de resumen con puntos de densidad;
- reporte PDF/texto con resumen de defensas rivales;
- tests y documentacion.

## Pasos

1. Modelo y dominio
   - Agregar `OpponentDefenseEvent` a `src/domain/types.ts`.
   - Agregar helpers de ubicacion de defensas rivales en `src/domain/court.ts`.
   - Agregar stats en `src/domain/periodStats.ts`.
   - Agregar insight por zona de defensa rival.

2. Estado
   - Agregar `recordOpponentDefense(defenseLocation)` en `useMatchStore`.
   - Validar periodo live y ubicacion.
   - Confirmar que undo no requiere logica extra.

3. Mapa y UI en vivo
   - Extender `CourtMapInput` con modo `opponent_defense`.
   - Cambiar boton `Defensa` a accion dividida `Defensa` / `Defensa rival`.
   - `Defensa` registra inmediatamente usando jugador seleccionado.
   - `Defensa rival` abre mapa y guarda ubicacion.
   - Actualizar ultimas acciones.

4. Resumenes visuales
   - Extender `CourtMapSummary` para puntos y defensas rivales.
   - Usar puntos de densidad sin dependencia nueva.
   - Agregar mapas `Dónde nos defendieron` en resumen de tiempo y final.
   - Agregar totales/zonas de defensas del rival.

5. Reporte
   - Extender `reportData` con defensas del rival por periodo, total y zonas.
   - Extender HTML/texto con labels en espanol.
   - Actualizar spec 005 con impacto.

6. Tests
   - Store: registrar, bloquear, score, undo.
   - Dominio: stats, zonas, insights.
   - Reporte: data y HTML/texto.
   - Validar legacy/missing location.

7. Validacion y docs
   - Actualizar `docs/implementation-log.md`.
   - Ejecutar `npm test`.
   - Ejecutar `npx tsc --noEmit`.

## Decisiones

- No se agrega dependencia de heatmap. Se usan puntos con tamano/opacidad por densidad cercana dentro de `CourtMapSummary`.
- `Defensa rival` es un evento nuevo, no una variante de `DefenseEvent`, porque no tiene jugador y si tiene ubicacion.
- El PDF mantiene resumen textual por zonas; el mapa visual exportable queda fuera de este slice.
- El popup de eleccion de defensa queda removido para reducir taps en vivo.

## Riesgos y mitigaciones

- Riesgo: union `MatchEvent` rompe exhaustividad.
  - Mitigacion: actualizar labels, stats, reportes y tests.
- Riesgo: mapa usado para defensa rival confunde con punto rival.
  - Mitigacion: textos especificos y feedback `Defensa rival registrada`.
- Riesgo: resumenes se saturan.
  - Mitigacion: tarjetas compactas y empty state `Sin ubicaciones registradas`.
